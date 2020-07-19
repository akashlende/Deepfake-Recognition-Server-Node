"""
Evaluates a folder of video files or a single file with a xception binary
classification network.

Usage:
python detect_from_video.py
    -i <folder with video files or path to video file>
    -m <path to model file>
    -o <path to output folder, will write one or multiple output videos there>

Author: Andreas Rรถssler
"""
import os
import requests
import json
import argparse
from os.path import join
import cv2
import dlib
import torch
import torch.nn as nn
from PIL import Image as pil_image
# from tqdm import tqdm

# from network.models import model_selection
from dataset.transform import xception_default_data_transforms


def get_boundingbox(face, width, height, scale=1.3, minsize=None):
    """
    Expects a dlib face to generate a quadratic bounding box.
    :param face: dlib face class
    :param width: frame width
    :param height: frame height
    :param scale: bounding box size multiplier to get a bigger face region
    :param minsize: set minimum bounding box size
    :return: x, y, bounding_box_size in opencv form
    """
    x1 = face.left()
    y1 = face.top()
    x2 = face.right()
    y2 = face.bottom()
    size_bb = int(max(x2 - x1, y2 - y1) * scale)
    if minsize:
        if size_bb < minsize:
            size_bb = minsize
    center_x, center_y = (x1 + x2) // 2, (y1 + y2) // 2

    # Check for out of bounds, x-y top left corner
    x1 = max(int(center_x - size_bb // 2), 0)
    y1 = max(int(center_y - size_bb // 2), 0)
    # Check for too big bb size for given x, y
    size_bb = min(width - x1, size_bb)
    size_bb = min(height - y1, size_bb)

    return x1, y1, size_bb


def preprocess_image(image, device=torch.device('cpu')):
    """
    Preprocesses the image such that it can be fed into our network.
    During this process we envoke PIL to cast it into a PIL image.

    :param image: numpy image in opencv form (i.e., BGR and of shape
    :return: pytorch tensor of shape [1, 3, image_size, image_size], not
    necessarily casted to cuda
    """
    # Revert from BGR
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # Preprocess using the preprocessing function used during training and
    # casting it to PIL image
    preprocess = xception_default_data_transforms['test']
    preprocessed_image = preprocess(pil_image.fromarray(image))
    # Add first dimension as the network expects a batch
    preprocessed_image = preprocessed_image.unsqueeze(0)
    preprocessed_image = preprocessed_image.to(device)
    return preprocessed_image


def predict_with_model(image, model, post_function=nn.Softmax(dim=1),
                       device=torch.device('cpu')):
    """
    Predicts the label of an input image. Preprocesses the input image and
    casts it to cuda if required

    :param image: numpy image
    :param model: torch model with linear layer at the end
    :param post_function: e.g., softmax
    :param cuda: enables cuda, must be the same parameter as the model
    :return: prediction (1 = fake, 0 = real)
    """
    # Preprocess
    preprocessed_image = preprocess_image(image, device)

    # Model prediction
    output = model(preprocessed_image)
    output = post_function(output)

    # Cast to desired
    _, prediction = torch.max(output, 1)    # argmax
    prediction = float(prediction.cpu().numpy())

    return int(prediction), output


def classifyImage(video_path, model_path, output_path, start_frame=0, end_frame=None, cuda=False, dev=False):
    image_conf = {}
    image_conf['result'] = []
    url = video_path
    link = os.path.split(url)
    print(link)
    fileName = link[1].split('.')[0]

    image = cv2.imread(url)

    # Face detector
    face_detector = dlib.get_frontal_face_detector()

    # Load model
    if model_path is not None:
        model = torch.load(model_path, map_location='cpu')

    if cuda:
        device = torch.device('cuda:0')
    else:
        device = torch.device('cpu')

    model = model.to(device)

    font_face = cv2.FONT_HERSHEY_SIMPLEX
    thickness = 2
    font_scale = 1

    video_fn = os.path.join("images", "results", link[1])
    os.makedirs(output_path, exist_ok=True)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_detector(gray, 1)

    height, width = image.shape[:2]

    if len(faces):
        for face in faces:
            # --- Prediction ---------------------------------------------------
            # Face crop with dlib and bounding box scale enlargement
            x, y, size = get_boundingbox(face, width, height)
            cropped_face = image[y:y+size, x:x+size]

            # Actual prediction using our model
            prediction, output = predict_with_model(cropped_face, model,
                                                    device=device)
            # ------------------------------------------------------------------

            # Text and bb
            x = face.left()
            y = face.top()
            w = face.right() - x
            h = face.bottom() - y
            label = 'fake' if prediction == 1 else 'real'
            color = (0, 255, 0) if prediction == 0 else (0, 0, 255)
            output_list = [round(float(x), 2) for x in
                           output.detach().cpu().numpy()[0]]
            cv2.putText(image, str(output_list)+'=>'+label, (x, y+h+30),
                        font_face, font_scale,
                        color, thickness, 2)
            image_conf['result'].append(prediction)
            cv2.rectangle(image, (x, y),
                          (x + w, y + h), color, 2)

        cv2.imwrite(video_fn, image)

    out_file = open(os.path.join("images",
                                 "json", fileName+".json"), "w")

    if len(image_conf['result']) == 0:
        image_conf['facesPresent'] = False
    else:
        image_conf['facesPresent'] = True
    json.dump(image_conf, out_file, indent=2)
    out_file.close()
    return image_conf


def test_full_image_network(video_path, model_path, output_path,
                            start_frame=0, end_frame=None, cuda=False, dev=False):
    """
    Reads a video and evaluates a subset of frames with the a detection network
    that takes in a full frame. Outputs are only given if a face is present
    and the face is highlighted using dlib.
    :param video_path: path to video file
    :param model_path: path to model file (should expect the full sized image)
    :param output_path: path where the output video is stored
    :param start_frame: first frame to evaluate
    :param end_frame: last frame to evaluate
    :param cuda: enable cuda
    :return:
    """
    # print('Starting: {}'.format(video_path))
    frame_conf = {}
    frame_conf['frames'] = []
    url = video_path

    link = os.path.split(url)
    fileName = link[1].split('.')[0]

    # #------- Custom code --------
    # #-----------------------------

    # Read and write
    reader = cv2.VideoCapture(video_path)

    video_fn = os.path.join("video-results", "video", fileName + '.mp4')
    os.makedirs(output_path, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'avc1')

    fps = reader.get(cv2.CAP_PROP_FPS)
    num_frames = int(reader.get(cv2.CAP_PROP_FRAME_COUNT))
    writer = None
    device = None

    # Face detector
    face_detector = dlib.get_frontal_face_detector()

    # Load model
    if model_path is not None:
        model = torch.load(model_path, map_location='cpu')

    if cuda:
        device = torch.device('cuda:0')
    else:
        device = torch.device('cpu')

    model = model.to(device)

    # Text variables
    font_face = cv2.FONT_HERSHEY_SIMPLEX
    thickness = 2
    font_scale = 1

    # Frame numbers and length of output video
    frame_num = 0
    assert start_frame < num_frames - 1
    end_frame = end_frame if end_frame else num_frames
    # pbar = tqdm(total=end_frame-start_frame)
    frame_conf["fps"] = fps

    while reader.isOpened():
        _, image = reader.read()
        if image is None:
            break
        frame_num += 1

        if frame_num < start_frame:
            continue
        # pbar.update(1)

        # Image size
        height, width = image.shape[:2]

        # Init output writer
        if writer is None:
            writer = cv2.VideoWriter(join(output_path, video_fn), fourcc, fps,
                                     (height, width)[::-1])

        # 2. Detect with dlib
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_detector(gray, 1)
        if len(faces):
            # For now only take biggest face
            face = faces[0]

            # --- Prediction ---------------------------------------------------
            # Face crop with dlib and bounding box scale enlargement
            x, y, size = get_boundingbox(face, width, height)
            cropped_face = image[y:y+size, x:x+size]

            # Actual prediction using our model
            prediction, output = predict_with_model(cropped_face, model,
                                                    device=device)
            # ------------------------------------------------------------------

            # Text and bb
            x = face.left()
            y = face.top()
            w = face.right() - x
            h = face.bottom() - y
            label = 'fake' if prediction == 1 else 'real'
            color = (0, 255, 0) if prediction == 0 else (0, 0, 255)
            output_list = ['{0:.2f}'.format(float(x)) for x in
                           output.detach().cpu().numpy()[0]]
            cv2.putText(image, str(output_list)+'=>'+label, (x, y+h+30),
                        font_face, font_scale,
                        color, thickness, 2)
            frame_conf['frames'].append(prediction)
            cv2.rectangle(image, (x, y),
                          (x + w, y + h), color, 2)

        if frame_num >= end_frame:
            break

        # Show
        # cv2.imshow('test', image)
        cv2.waitKey(33)     # About 30 fps
        writer.write(image)
    # pbar.close()
    if writer is not None:
        writer.release()

    out_file = open(os.path.join("video-results",
                                 "json", fileName+".json"), "w")
    json.dump(frame_conf, out_file, indent=2)
    out_file.close()
    return frame_conf


if __name__ == '__main__':
    p = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    p.add_argument('--video_path', '-i', type=str)
    p.add_argument('--model_path', '-m', type=str, default=None)
    p.add_argument('--output_path', '-o', type=str,
                   default='.')
    p.add_argument('--start_frame', type=int, default=0)
    p.add_argument('--end_frame', type=int, default=None)
    p.add_argument('--cuda', action='store_true')
    p.add_argument('--dev', action='store_true')
    args = p.parse_args()
    url = args.video_path

    link = os.path.split(url)
    fileName = link[1].split('.')[0]

    if args.dev:
        frame_conf = open("frames.json", 'r').read()
        out_file = open(os.path.join("video-results",
                                     "json", fileName + '.json'), "w")
        json.dump(json.loads(frame_conf), out_file, indent=2)
        out_file.close()
    else:
        if url.endswith('.mp4') or url.endswith('.avi'):
            print(test_full_image_network(**vars(args)))
        elif url.endswith('.jpg') or url.endswith('.jpeg') or url.endswith('.png'):
            print(classifyImage(**vars(args)))
        else:
            r = requests.get(url, allow_redirects=True)
            file_name = os.path.join('input', 'video.mp4')
            open(file_name, 'wb').write(r.content)
            args.video_path = file_name
            print(test_full_image_network(**vars(args)))
