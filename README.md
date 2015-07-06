
## edit below parameters from boardmon.sh
export EMAIL=your_mail_id@email.com
export EMAILPASS=your_email_pass
export EMAIL_RECIPANT=list_of_recipant_emails@email.com

## execute boardmon.sh at crontab
> crontab -l
0,30 * * * * /path_to_BoardMailer/boardmon.sh

