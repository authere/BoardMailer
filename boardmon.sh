#!/bin/sh

export EMAIL=your_mail_id@email.com
export EMAILPASS=your_email_pass
export EMAIL_RECIPANT=list_of_recipant_emails@email.com
killall -TERM node
sleep 1;
while true; do
node app.js
sleep 1800
done
