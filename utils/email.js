const nodemailer =  require('nodemailer');

const sendEmail = async options =>{
    const transporter = nodemailer.createTransport({
        service :'Gmail',
        auth :{
            user: process.env.EMAIL_USERNAME,
            password:process.env.EMAIL_PASSWORD,
            host:process.env.EMAIL_HOST,
            port:process.env.EMAIL_PORT
        },
    });
    const mailOptions = {
        from:"LC Tournament Co.",
        to:options.email,
        subject:subject.subject,
        text:options.message
        }

    transporter.sendMail(mailOptions);
}

module.exports = sendEmail;