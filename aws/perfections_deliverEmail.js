const SendEmailCommand = require("@aws-sdk/client-ses").SendEmailCommand;
const SESClient = require("@aws-sdk/client-ses").SESClient;
const ses = new SESClient({ region: "us-east-1" });

function validateBody(body) {
    const errors = []

    // First Name
    if (!body.firstName) {
        errors.push("First name is required")
    }
    if (typeof body.firstName !== "string") {
        errors.push("First name must be a string")
    }

    // Last Name
    if (!body.lastName) {
        errors.push("Last name is required")
    }
    if (typeof body.lastName !== "string") {
        errors.push("Last name must be a string")
    }

    // Contact Method
    if (!body.contactMethod) {
        errors.push("Contact method is required")
    }
    if (!["phoneCall", "textMessage", "email"].includes(body.contactMethod)) {
        errors.push("Contact method must be one of phoneCall, textMessage, email")
    }

    // Phone number
    if (["phoneCall", "textMessage"].includes(body.contactMethod)) {
        if (!body.phoneNumber) {
            errors.push("Phone number is required")
        }
        if (!body.phoneNumber.match(/^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/)) {
            errors.push("Phone number is invalid")
        }
    }

    // Email
    if (body.contactMethod === "email") {
        if (!body.email) {
            errors.push("Email is required")
        }
        if (!body.email.toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            )) {
            errors.push("Email is invalid")
        }
    }

    // Service address
    if (!body.street || !body.city || !body.state || !body.zip) {
        errors.push("Service address is required")
    }

    // Description
    if (!body.description) {
        errors.push("Description is required")
    }

    return errors
}

function formatData(data) {
    var contactMethod
    switch (data.contactMethod) {
        case 'phoneCall':
            contactMethod = 'phone call'
            break
        case 'textMessage':
            contactMethod = 'text message'
            break
        case 'email':
            contactMethod = 'email'
            break
        default:
            contactMethod = 'unknown'
    }

    var contact
    if (data.contactMethod === 'phoneCall' || data.contactMethod == 'textMessage') {
        contact = data.phoneNumber
    } else if (data.contactMethod === 'email') {
        contact = data.email
    }

    var content = `
        <html>
            <head>
                <title>Quote request from ${data.firstName} ${data.lastName}</title>
            </head>
            <body>
                <b>${data.firstName} ${data.lastName}</b> has requested consultation via ${contactMethod} at <b>${contact}</b>.
                <br />
                <br />
                Service Address
                <br />
                <b>${data.street}</b>
                <br />
                <b>${data.city}, ${data.state} ${data.zip}</b>
                <br />
                <br />
                Description
                <br />
                <b>${data.description}</b>
            </body>
        </html>`

    return content
}

/**
* Returns an HTML page containing an interactive Web-based
* tutorial. Visit the function URL to see it and learn how
* to build with lambda.
*/
exports.handler = async (event) => {
    var data = JSON.parse(event.body);

    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(["success"]),
    };

    const errors = validateBody(data)
    if (errors && errors.length > 0) {
        response.statusCode = 400
        response.body = JSON.stringify(errors)
        return response
    }

    const command = new SendEmailCommand({
        Destination: {
            ToAddresses: ["justin@perfectionslawnandproperty.com"],
        },
        Message: {
            Body: {
                Html: { Data: data ? formatData(data) : "no data" },
            },

            Subject: { Data: `Quote request from ${data?.firstName} ${data?.lastName}` },
        },
        Source: "noreply@perfectionslawnandproperty.com",
    });

    try {
        let response = await ses.send(command);
    } catch (error) {
        console.error(error);
        response.statusCode = 400;
        response.body = error;
    }
    return response;
};
