from requests_oauthlib import OAuth1
import requests
import sys
import getopt
import json


def comment(id, status, confidence, timestamp, auth):
    url = 'https://api.twitter.com/1.1/statuses/update.json'
    auth = OAuth1(auth["consumerKey"], auth["consumerSecret"],
                  auth["oauthToken"], auth["tokenSecret"])
    params = {
        'status': "The video is " + status + "\nConfidence = "+confidence+"\n,
        'in_reply_to_status_id': id,
        'auto_populate_reply_metadata': 'true'
    }

    response = requests.post(url, auth=auth, params=params)
    print(response.status_code)

# comment.py --tweetId 1269199358441877504 --status true --confidence 0.98 --timestamp [1,2,3] --auth ./auth.json


def main(argv):
    recipientId = ''
    confidence = 0
    timestamp = []
    auth = {}
    status = ''
    try:
        opts, args = getopt.getopt(argv, "hi:s:c:t:a:", [
                                   "help", "tweetId=", "status=", "confidence=", "timestamp=", "auth="])
    except getopt.GetoptError:
        print('Usage: comment -i <tweet_id> -s <status> -c <confidence> -t <list_of_timestamps> -a <JSON_auth_file_path>')
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print("-h or --help       : View list of command line arguments available.  For example: comment -h \n")
            print("-i or --tweetId    : Tweet ID of the status you want to comment to. For example: 1269199358441877504\n")
            print("-s or --status     : Status of the video (Real or Fake) given by (true or false). For example:  true\n")
            print(
                "-c or --confidence : Confidence of the prediction. For example:  0.89\n")
            print(
                "-t or --timestamp  : List of timestamps (No spaces allowed). For example:  [00:30,01:21,03:23,04:45]\n")
            print("-a or --auth       : Path to json auth file containing consumer key and secret along with Oauth token and secret. For example:  ./auth.json\n")
        elif opt in ("-i", "--tweetId"):
            recipientId = arg
        elif opt in ("-c", "--confidence"):
            confidence = arg
        elif opt in ("-t", "--timestamp"):
            timestamp = arg[1:len(arg)-1].split(',')
        elif opt in ("-a", "--auth"):
            f = open(arg, 'r')
            auth = json.loads(f.read())
        elif opt in ("-s", "--status"):
            status = "not deepfake" if (arg == 'true') else "deepfake"
    comment(recipientId, status, confidence, timestamp, auth)


if __name__ == "__main__":
    main(sys.argv[1:])
