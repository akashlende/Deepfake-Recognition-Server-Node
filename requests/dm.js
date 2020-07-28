const auth = require("./auth.json");

module.exports = {
    getBody: (recipient_id, remaining, limit) => {
        text = `Thank you for using DeepFake Recognition API by The Sentinels.\n\n ${remaining}/${limit} API Calls remaining \n*Daily quota resets at 01/08/2020 23:59:59\n\nFor complete report and more features visit our home page.`;

        return {
            event: {
                type: "message_create",
                message_create: {
                    target: {
                        recipient_id: recipient_id,
                    },
                    message_data: {
                        text: text,
                        ctas: [
                            {
                                type: "web_url",
                                label: "Visit The Sentinels",
                                url: "https://www.dscmescoe.com/",
                            },
                        ],
                    },
                },
            },
        };
    },

    getHeader: () => {
        return {
            "Content-Type": "application/json",
            'Authorization': 'OAuth oauth_consumer_key="ndaviAaGbKW4lu4nW16303acU",oauth_token="1267016760848416769-UrL7a2FKcqf0QSmLmcxhDNaiGvHmTR",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1591903300",oauth_nonce="h5fer8hsoh2",oauth_version="1.0",oauth_signature="BUc5sjLZNJO1E2Hs6jFw3eeIHT4%3D"'
        };
    },
};
