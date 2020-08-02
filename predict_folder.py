import argparse
import os
import re
import time

import torch
import pandas as pd
from kernel_utils import VideoReader, FaceExtractor, confident_strategy, predict_on_video_set, predict_image
from classifiers import DeepFakeClassifier

if __name__ == '__main__':
    parser = argparse.ArgumentParser("Predict test videos")
    arg = parser.add_argument
    arg('--img', type=str, help="image file")
    arg('--models', nargs='+', required=True, help="checkpoint files")
    arg('--frames', default=32, help="Number of frames in video", type=int)
    arg('--test-dir', type=str,
        help="path to directory with videos")
    arg('--output', type=str, required=False,
        help="path to output csv", default="submission.csv")
    arg('--weights-dir', type=str, default="weights",
        help="path to directory with checkpoints")
    args = parser.parse_args()

    models = []
    model_paths = [os.path.join(args.weights_dir, model)
                   for model in args.models]
    for path in model_paths:
        model = DeepFakeClassifier(encoder="tf_efficientnet_b7_ns").to("cuda")
        print("loading state dict {}".format(path))
        checkpoint = torch.load(path, map_location="cpu")
        state_dict = checkpoint.get("state_dict", checkpoint)
        model.load_state_dict(
            {re.sub("^module.", "", k): v for k, v in state_dict.items()}, strict=False)
        model.eval()
        del checkpoint
        models.append(model.half())

    frames_per_video = args.frames
    video_reader = VideoReader()

    def video_read_fn(x): return video_reader.read_frames(
        x, num_frames=frames_per_video)
    face_extractor = FaceExtractor(video_read_fn)
    input_size = 380

    if args.img == None:
        print("Video")
        strategy = confident_strategy
        stime = time.time()
        test_videos = sorted(
            [x for x in os.listdir(args.test_dir) if x[-4:] == ".mp4"])
        print("Predicting {} videos".format(len(test_videos)))
        predictions = predict_on_video_set(face_extractor=face_extractor, input_size=input_size, models=models,
                                        strategy=strategy, frames_per_video=frames_per_video, videos=test_videos,
                                        num_workers=6, test_dir=args.test_dir)
        submission_df = pd.DataFrame(
            {"filename": test_videos, "label": predictions})
        submission_df.to_csv(args.output, index=False)
        print("Elapsed:", time.time() - stime)
    else:
        print("Image")
        stime = time.time()
        predictions = predict_image(model=models[0], path=args.img, processor=video_reader, face_extractor=face_extractor)
        faces = 0
        if predictions:
            faces = 1
        filename = args.img.split("/")[-1]
        print(predictions)
        submission_df = pd.DataFrame(
            {"filename": filename, "label": predictions, "faces": faces}, index=[0])
        submission_df.to_csv(args.output, index=False)
        print("Elapsed:", time.time() - stime)
