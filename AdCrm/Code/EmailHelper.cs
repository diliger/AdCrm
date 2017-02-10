using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Configuration;
using System.Net;
using System.Net.Mail;
using System.Threading;
using System.Data.Objects.SqlClient;
using System.IO;
using System.Globalization;

namespace AdCrm
{
    public class EmailHelper
    {
        private string templatePath = "/Content/templates/letter.html";

        public void SendEmailAsynch(string Subject, string Text, string ToEmail, Attachment[] Attachments, object UserToken, Action<object, System.ComponentModel.AsyncCompletedEventArgs> OnComplete)
        {
            SendEmailAsynch(Subject, Text, ToEmail, string.Empty, Attachments, UserToken, OnComplete);
        }

        public void SendEmailAsynch(string Subject, string Text, string ToEmail, string CopyTo, Attachment[] Attachments, object UserToken, Action<object, System.ComponentModel.AsyncCompletedEventArgs> OnComplete)
        {
            SmtpClient client = GetSmtpClient();
            MailMessage message = GetMailMessage(ToEmail, CopyTo, Subject, Text, Attachments);

            client.SendCompleted += (s, a) =>
            {
                if (OnComplete != null)
                {
                    OnComplete(s, a);
                }

                client.Dispose();
            };

            client.SendAsync(message, UserToken);
        }

        public void SendEmail(string Subject, string Text, string ToEmail, IEnumerable<string> Files = null)
        {
            AdCrm.Models.EmailTemplate master = Settings.GetEmailTemplate("Master");
            if (master != null && master.Body.IsNotNullOrEmpty())
            {
                string baseUrl = MvcApplication.FullRootUrl;
                string body = master.Body.Replace("{url}", baseUrl);
                Text = body.Replace("{body}", Text);
            }

            SmtpClient client = GetSmtpClient();
            MailMessage message = GetMailMessage(ToEmail, Subject, Text);
            if (Files != null)
            {
                foreach (string file in Files)
                {
                    message.Attachments.Add(new Attachment(file));
                }
            }
            client.Send(message);
            client.Dispose();
        }

        public MailMessage GetMailMessage(string ToEmail, string Subject, string Text, Attachment[] Attachments = null)
        {
            return GetMailMessage(ToEmail, null, Subject, Text, Attachments);
        }

        public MailMessage GetMailMessage(string ToEmail, string CopyTo, string Subject, string Text, Attachment[] Attachments = null)
        {
            List<string> toEmails = GetEmails(ToEmail);
            List<string> copyTo = GetEmails(CopyTo);
            MailMessage message = new MailMessage();

            message.From = new MailAddress(Settings.ServerEmail);
            toEmails.ForEach(val =>
            {
                message.To.Add(new MailAddress(val));
            });
            copyTo.ForEach(val =>
            {
                message.CC.Add(new MailAddress(val));
            });
            message.Subject = HttpUtility.HtmlEncode(Subject);
            message.Body = Text;
            message.IsBodyHtml = true;
            message.Priority = MailPriority.High;
            message.From = new MailAddress(Settings.ServerEmail, Settings.ServerEmailName, System.Text.Encoding.UTF8);

            if (Attachments != null)
            {
                foreach (Attachment a in Attachments)
                {
                    message.Attachments.Add(a);
                }
            }

            return message;
        }

        public SmtpClient GetSmtpClient()
        {
            SmtpClient client = new SmtpClient(Settings.ServerSMTPHost, Settings.ServerSMTPPort);

            client.UseDefaultCredentials = false;
            client.Credentials = new NetworkCredential(Settings.ServerSMTPLogin, Settings.ServerSMTPPassword);
            client.EnableSsl = false;
            client.Timeout = 60000;

            return client;
        }

        public string GetHtmlLetter(string Text)
        {
            TextReader tr = new StreamReader(HttpRuntime.AppDomainAppPath + templatePath);
            string result = tr.ReadToEnd();

            tr.Dispose();
            result = result.Replace("{0}", Text);

            return result;
        }

        protected List<string> GetEmails(string Value)
        {
            if (Value.IsNullOrEmpty())
            {
                return new List<string>();
            }

            return Value.Split(";").Select(val => val.Trim()).Where(val => val.IsNotNullOrEmpty()).ToList();
        }
    }
}