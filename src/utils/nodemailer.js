import nodemailer from 'nodemailer'
import Mailgen  from 'mailgen'

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });


const sendMail=async (options)=>{

    var mailGenerator = new Mailgen({
        theme: 'salted',
        product: {
            // Appears in header & footer of e-mails
            name: 'BookBazzer',
            link: 'www.youtube.com'
            // Optional logo
            // logo: 'https://mailgen.js/img/logo.png'
        }
    });

        
    // Generate an HTML email with the provided contents
    const emailHtml = mailGenerator.generate(options.mailgenContent);

    // Generate the plaintext version of the e-mail (for clients that do not support HTML)
    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

    const mail = {
        from: 'BookBazzer@gmail.com', // We can name this anything. The mail will go to your Mailtrap inbox
        to: options.email, // receiver's mail
        subject: options.subject, // mail subject
        text: emailTextual, // mailgen content textual variant
        html: emailHtml, // mailgen content textual variant
    };

    try {
        await transporter.sendMail(mail);
    } catch (error) {
        // As sending email is not strongly coupled to the business logic it is not worth to raise an error when email sending fails
        // So it's better to fail silently rather than breaking the app
        console.log(
            'Email service failed silently. Make sure you have provided your MAILTRAP credentials in the .env file'
        );
        console.log('Error: ', error);
    }
}


const VerifyemailMailgencontent = (username,verificationUrl)=>{
    return{
        body: {
            name: username,
            intro: 'Welcome to BookBa! We\'re very excited to have you on board.',
            action: {
                instructions: 'To verify your email please click on the following button:',
                button: {
                    color: '#22BC66', // Optional action button color
                    text: 'Verify your account',
                    link: verificationUrl
                }
            },
            outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
        }
    };
    
}

async function forgotsendmail(options) {
    try {
      const htmlMailContent = `
      <html>
      <head>
          <style>
              /* Define CSS styles for better presentation */
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
              }
              .container {
                  max-width: 600px;
                  margin: auto;
                  padding: 20px;
                  border: 1px solid #ccc;
                  border-radius: 5px;
                  background-color: #f9f9f9;
              }
              h2 {
                  color: #333;
              }
              p {
                  color: #555;
              }
              .otp {
                  font-size: 24px;
                  font-weight: bold;
                  color: #007bff;
              }
              .footer {
                  margin-top: 20px;
                  color: #888;
              }
          </style>
      </head>
      <body>
      <div class="container">
          <h2>Do Not Share Your OTP</h2>
          <p>Dear User,</p>
          <p>Your One-Time Password (OTP) is: <strong>${options.content}</strong></p>
          <p>Please use this OTP to complete your verification process.</p>
          <div class="footer">
              <p>Thank You,</p>
              <p>TrackOnWeb Team</p>
          </div>
      </div>
      </body>
      </html>
      `;
      await transporter.sendMail({
        from: 'vishnumarripalli@gmail.com',
        to: options.email,
        subject: options.subject,
        html: htmlMailContent,
      });
    } catch (error) {
      console.error('Error sending mail', error);
      throw new ApiError(500, 'Failed to send mail');
    }
  }

export{
    sendMail,
    VerifyemailMailgencontent,
    forgotsendmail
}