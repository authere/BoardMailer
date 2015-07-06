#!/bin/sh
export EMAIL=your_mail_id@email.com
export EMAILPASS=your_email_pass
export EMAIL_RECIPANT=list_of_recipant_emails@email.com
cd `dirname "$0"`;
node app.js > /tmp/`basename "$0"`.log
