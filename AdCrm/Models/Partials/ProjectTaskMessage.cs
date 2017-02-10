using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Events;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ProjectTaskMessage : IEntity, ICreateEdit
    {
        public Contractor Contractor
        {
            get
            {
                return ProjectTask != null && ProjectTask.Project != null ? ProjectTask.Project.Contractor : null;
            }
        }

        public Employee Employee
        {
            get
            {
                return ProjectTask != null ? ProjectTask.Employee : null;
            }
        }

        public User Responsible
        {
            get
            {
                return ProjectTask != null ? ProjectTask.UserResponsible : null;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.ChangeDate,
                this.Changer,
                CreateDate = this.CreateDate.ToShortDateFullTimeString(),
                this.Creator,
                this.Notify,
                this.CreatorName,
                this.TaskID,
                this.Text,
                this.ID
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            e.Cancel = e.Action == EntityJs.Client.Events.ActionsEnum.Delete && user.RoleID != (int)RolesEnum.Admin;
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            var files = this.Files.ToList();
            foreach (ProjectFile file in files)
            {
                var args = new EntityJs.Client.Events.CheckPermissionsEventArgs(db, "ProjectFiles", "ProjectFile", file, EntityJs.Client.Events.ActionsEnum.Delete);
                file.OnDeleting(args);
                db.ProjectFiles.DeleteObject(file);
                file.OnDeleted(args);
            }
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            this.CreatorName = db.CurrentUser.FullName;
            SendNotification(db);
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {

        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void SendNotification(BuildingEntities db)
        {
            string tcreator = ProjectTask != null ? ProjectTask.Creator : string.Empty;
            string TemplateName = "ProjectTaskMessage_Inserted";
            string[] notifies = this.Notify.StringAndTrim().Split(';');

            List<string> emails = new List<string>();

            this.Notify = "";
            foreach (string n in notifies)
            {
                this.Notify += n + ":";
                switch (n)
                {
                    case "contractor":
                        if (Contractor != null)
                        {
                            string email = Contractor.Email.StringAndTrim();
                            if (email.IsNotNullOrEmpty())
                            {
                                emails.Add(email);
                                this.Notify += email + ";";
                            }
                            email = Contractor.GetEmail(db).StringAndTrim();
                            emails.AddRange(email.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries));
                            this.Notify += email;
                            this.Notify = this.Notify.Trim(';');
                        }
                        break;
                    case "employee":
                        if (Employee != null)
                        {
                            string email = Employee.GetEmails();
                            emails.Add(email);
                            this.Notify += email;
                        }
                        break;
                    case "creator":
                        if (tcreator.IsNotNullOrEmpty())
                        {
                            User user = db.Users.FirstOrDefault(val => !val.Deleted && val.Login == tcreator);
                            if (user != null && user.Email.IsNotNullOrEmpty())
                            {
                                emails.Add(user.Email);
                                this.Notify += user.Email;
                            }
                        }
                        break;
                    case "responsible":
                        if (Responsible != null)
                        {
                            emails.Add(Responsible.Email);
                            this.Notify += Responsible.Email;
                        }
                        break;
                    case "last":
                        if (ProjectTask != null)
                        {
                            ProjectTaskMessage m = ProjectTask.Messages.OrderBy(val => val.ID).LastOrDefault();
                            if (m != null && m.ID > 0)
                            {
                                User user = db.Users.FirstOrDefault(val => !val.Deleted && val.Login == m.Creator);
                                if (user != null && user.Email.IsNotNullOrEmpty())
                                {
                                    emails.Add(user.Email);
                                    this.Notify += user.Email;
                                }
                            }
                        }
                        break;
                    default:
                        if (n.StartsWith("another:"))
                        {
                            int userID = n.Split(':').Last().ToIntOrDefault() ?? 0;
                            User user = db.Users.FirstOrDefault(val => !val.Deleted && val.ID == userID);
                            if (user != null && user.Email.IsNotNullOrEmpty())
                            {
                                emails.Add(user.Email);
                                this.Notify += user.Email;
                            }
                        }
                        break;
                }
                this.Notify += ";";
            }
            this.Notify = this.Notify.Trim(';');

            emails = emails.Where(val => val.IsNotNullOrEmpty()).ToList();

            EmailTemplate template = Settings.GetEmailTemplate(TemplateName);
            if (template.Body.IsNullOrEmpty() || !emails.Any())
                return;

            DynamicDocuments.DataProvider dp = new Models.DynamicDocuments.DataProvider()
            {
                Project = this.ProjectTask.Project,
                Number = this.ID.ToString(),
                //User = this.UserResponsible,
                Data = new
                {
                    //User = this.UserResponsible,
                    Task = this.ProjectTask,
                    Message = this
                    //Employee = this.Employee,
                    //Status = this.Status
                }
            };

            try
            {
                string mailSubject = DynamicDocumentGenerator.Generator.GenerateText(template.Subject, dp);
                string mailBody = DynamicDocumentGenerator.Generator.GenerateText(template.Body, dp);

                EmailHelper emailHelper = new EmailHelper();
                emailHelper.SendEmail(mailSubject, mailBody, string.Join(";", emails.Distinct()));
            }
            catch (Exception ex)
            {
                new Log().Error(ex);
            }
        }
    }
}