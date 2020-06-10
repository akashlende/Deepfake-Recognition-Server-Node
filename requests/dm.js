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
            Authorization: `OAuth oauth_consumer_key=${auth.consumerKey},oauth_token=${auth.oauthToken},oauth_signature_method="HMAC-SHA1",oauth_timestamp="1591518874",oauth_nonce="Uy55DK3Deec",oauth_version="1.0",oauth_signature="WMw7zGM1TTnQP4CKBb8BuL3qmH0%3D"`,
            Cookie:
                'personalization_id="v1_VIUj6hiI6FiSRMW4xROMgQ=="; guest_id=v1%3A159091927093030167; lang=en',
        };
    },
};
