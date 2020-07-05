from requests_oauthlib import OAuth1
import requests
import sys
import getopt
import json


def dm(id, message, auth):
    url = 'https://api.twitter.com/1.1/direct_messages/events/new.json'
    auth = OAuth1(auth["consumerKey"], auth["consumerSecret"],
                  auth["oauthToken"], auth["tokenSecret"])
    payload = {
        "event": {
            "type": "message_create",
            "message_create": {
                "target": {
                    "recipient_id": id
                },
                "message_data": {
                    "text": message,
                    "ctas": [
                        {
                            "type": "web_url",
                            "label": "Visit The Sentinels",
                            "url": "https://www.dscmescoe.com/"
                        }
                    ]
                }
            }
        }
    }
    data = json.dumps(payload)
    response = requests.post(url, auth=auth, data=data)
    print(response.status_code)


def main(argv):
    recipientId = ''
    message = ''
    auth = {}
    try:
        opts, args = getopt.getopt(argv, "hi:m:a:", [
                                   "help", "recepient=", "message=", "auth="])
    except getopt.GetoptError:
        print('Usage: dm -i <recipient_id> -m <message> --auth <JSON_auth_file_path>')
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print("-h or --help       : View list of command line arguments available.  For example: comment -h \n")
            print("-i or --recepient  : Recepient ID of the person you want to dm to. For example: 12084584214993220323\n")
            print("-m or --message    : Text to direct message the recepient")
            print("-a or --auth       : Path to json auth file containing consumer key and secret along with Oauth token and secret. For example:  ./auth.json\n")
        elif opt in ("-i", "--recepient"):
            recipientId = arg
        elif opt in ("-m", "--message"):
            message = arg
        elif opt in ("--auth"):
            f = open(arg, 'r')
            auth = json.loads(f.read())
    dm(recipientId, message, auth)


if __name__ == "__main__":
    main(sys.argv[1:])
