from requests_oauthlib import OAuth1
import requests
import sys
import getopt
import json


def dm(id, remaining, limit, auth):
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
                    "text": "Thank you for using DeepFake Recognition API by The Sentinels.\n ("+remaining+"/"+limit+" API Calls remaining) \n*Daily limit will reset at 01/08/2020 23:59:59\n\nFor complete report and more features visit our home page.",
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
    response = requests.post(url, auth=auth,data=data)
    print(response.status_code)


def main(argv):
    recipientId = ''
    remaining = ''
    limit = ''
    auth = {}
    try:
        opts, args = getopt.getopt(argv, "hi:r:l:a:", [
                                   "help", "recepient=", "remaining=", "limit=", "auth="])
    except getopt.GetoptError:
        print('Usage: dm -i <recipient_id> -r <remaining> -l <limit> --auth <JSON_auth_file_path>')
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print("-h or --help       : View list of command line arguments available.  For example: comment -h \n")
            print("-i or --recepient  : Recepient ID of the person you want to dm to. For example: 12084584214993220323\n")
            print("-r or --remaining  : Remaining api calls for an user")
            print("-l or --limit      : Total api calls allocated to an user")
            print("-a or --auth       : Path to json auth file containing consumer key and secret along with Oauth token and secret. For example:  ./auth.json\n")
        elif opt in ("-i", "--recepient"):
            recipientId = arg
        elif opt in ("-r", "--remaining"):
            remaining = arg
        elif opt in ("-l", "--limit"):
            limit = arg
        elif opt in ("--auth"):
            f = open(arg, 'r')
            auth = json.loads(f.read())
    dm(recipientId, remaining, limit, auth)


if __name__ == "__main__":
    main(sys.argv[1:])
