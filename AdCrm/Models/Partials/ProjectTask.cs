using EntityJs.Client.Objects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class ProjectTask : IEntity, ICreateEdit
    {
        private int? OldStatusID { get; set; }
        public bool Completed
        {
            get
            {
                return this.StatusID == TaskStatusesEnum.Completed;
            }
            set
            {
                if (value)
                    this.StatusID = TaskStatusesEnum.Completed;
                else
                    this.StatusID = this.StatusID == 0 ? TaskStatusesEnum.New : this.StatusID;
            }
        }
        public string EmployeeName
        {
            get
            {
                return this.Employee != null ? this.Employee.FullName : string.Empty;
            }
        }
        public string ResponsibleName
        {
            get
            {
                return this.UserResponsible != null ? this.UserResponsible.FullName : string.Empty;
            }
        }
        public string PreviousName
        {
            get
            {
                return this.PreviousTask != null ? this.PreviousTask.Name : string.Empty;
            }
        }
        public bool Overdue
        {
            get
            {
                return this.DateEndPlan < DateTime.Now.Date && !Completed;
            }
        }
        public string ProjectName
        {
            get
            {
                return this.Project != null ? this.Project.FullName : string.Empty;
            }
        }
        public int? ProjectEmployeeID
        {
            get
            {
                return this.Project != null ? this.Project.EmployeeID : null;
            }
        }
        public TimeSpan? Term
        {
            get
            {
                if (!TermHours.HasValue)
                    return null;
                return TimeSpan.FromHours(TermHours.Value);
            }
            set
            {
                if (value.HasValue)
                    TermHours = value.Value.TotalHours;
                else
                    TermHours = null;
            }
        }

        public string ProjectType
        {
            get
            {
                return this.Project != null && this.Project.ProjectType != null ? this.Project.ProjectType.Name : string.Empty;
            }
        }

        public object ToJson()
        {
            User user = HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();

            Dictionary<string, object> result = new Dictionary<string, object>();
            result["Comments"] = this.Comments;
            result["Creator"] = this.Creator;
            result["ID"] = this.ID;
            result["TypeID"] = this.TypeID;
            result["CreateDate"] = this.CreateDate.ToShortDateTimeString();
            result["ProjectID"] = this.ProjectID;
            result["DateEnd"] = this.DateEnd;
            result["DateEndPlan"] = this.DateEndPlan;
            result["EmployeeID"] = this.EmployeeID;
            result["OrderNumber"] = this.OrderNumber;
            result["ChangeDate"] = this.ChangeDate;
            result["Changer"] = this.Changer;
            result["DateBegin"] = this.DateBegin;
            result["Message"] = this.Message;
            result["Name"] = this.Name;
            result["ResponsibleID"] = this.ResponsibleID;
            result["ResponsibleName"] = this.ResponsibleName;
            result["StatusID"] = this.StatusID;
            result["StatusText"] = this.StatusText;
            result["Completed"] = this.Completed;
            result["EmployeeName"] = this.EmployeeName;
            result["PreviousID"] = this.PreviousID;
            result["PreviousName"] = this.PreviousName;
            result["Overdue"] = this.Overdue;
            result["ProjectType"] = this.ProjectType;
            result["ProjectName"] = this.ProjectName;
            result["Description"] = this.Description;
            result["AnalystDescription"] = this.AnalystDescription;
            result["TesterDescription"] = this.TesterDescription;
            result["PriorityID"] = this.PriorityID;
            result["TurnID"] = this.TurnID;
            result["Version"] = this.Version;
            result["Deleted"] = this.Deleted;
            result["VisibilityID"] = this.VisibilityID;
            result["TermHours"] = this.TermHours;
            result["Term"] = this.Term.HasValue ? Term.Value.ToHourMinuteString() : string.Empty;
            if (user.RoleID < (int)RolesEnum.Employee)
            {
                result["Price"] = this.Price;
                result["InvoiceID"] = this.InvoiceID;
                result["InvoiceNumber"] = this.Invoice != null ? this.Invoice.Number : string.Empty;
            }
            return result;
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            e.Cancel = this.Deleted || e.Action != EntityJs.Client.Events.ActionsEnum.Select && Project != null && Project.Archived;
            if (!e.Cancel && user.RoleID == (int)RolesEnum.Client)
            {
                e.Cancel = this.Project.ContractorID != user.ContractorID || this.VisibilityID == TaskVisibilitiesEnum.Hidden;
            }
            else if (!e.Cancel && user.RoleID == (int)RolesEnum.Employee)
            {
                e.Cancel = this.EmployeeID != user.EmployeeID && this.ResponsibleID != user.ID || this.VisibilityID == TaskVisibilitiesEnum.Hidden;
            }

            if (user.RoleID > (int)RolesEnum.Manager)
            {
                e.Values.Remove("Price");
                e.Values.Remove("InvoiceID");
                e.Values.Remove("VisibilityID");
            }
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
            this.OldStatusID = StatusID;
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            var tasks = this.NextTasks.ToList();
            foreach (ProjectTask task in tasks)
            {
                //var args = new EntityEventArgs(e.Context, "ProjectTasks", "ProjectTask", task, EntityJs.Client.Events.ActionsEnum.Edit);
                //task.OnUpdating(args);
                task.PreviousID = this.PreviousID;
                //db.ProjectTasks.DeleteObject(task);
                //task.OnUpdated(args);
            }

            var files = this.Files.ToList();
            foreach (ProjectFile file in files)
            {
                file.ProjectTaskID = null;
            }
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (this.DateEnd.HasValue)
            {
                this.StatusID = TaskStatusesEnum.Completed;
            }
            if (this.StatusID == 0)
            {
                this.StatusID = TaskStatusesEnum.New;
            }
            if (this.ResponsibleID == 0 && this.Project != null)
            {
                this.UserResponsible = this.Project.UserResponsible;
            }
            if (!this.EmployeeID.HasValue && this.Project != null && this.Project.EmployeeID.HasValue)
            {
                this.EmployeeID = this.Project.EmployeeID;
            }
            if (!this.EmployeeID.HasValue && this.UserResponsible != null && this.UserResponsible.EmployeeID.HasValue)
            {
                this.EmployeeID = this.UserResponsible.EmployeeID;
            }
            if (!this.TurnID.HasValue)
            {
                this.Turn = db.Statbooks.FirstOrDefault(val => !val.Deleted && val.TypeID == StatbookTypesEnum.TaskTurns);
            }
            if (!this.VisibilityID.HasValue)
            {
                this.Visibility = db.Statbooks.FirstOrDefault(val => !val.Deleted && val.TypeID == StatbookTypesEnum.TaskVisibilities);
            }
            if (!TypeID.HasValue)
            {
                Type = db.TaskTypes.FirstOrDefault(val => !val.Deleted && val.SysName == "Task");
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            //if (this.DateEnd.HasValue)
            //{
            //    this.StatusID = TaskStatusesEnum.Completed;
            //}
            //else 
            if (this.OldStatusID != this.StatusID && this.StatusID == TaskStatusesEnum.Completed)
            {
                this.DateEnd = DateTime.Now;
            }
            //UpdateNextTasks();

            if (this.ResponsibleID == 0 && this.Project != null)
            {
                this.UserResponsible = this.Project.UserResponsible;
            }
            if (!this.EmployeeID.HasValue && this.UserResponsible != null && this.UserResponsible.EmployeeID.HasValue)
            {
                this.EmployeeID = this.UserResponsible.EmployeeID;
            }

            if (this.OldStatusID.HasValue && this.OldStatusID != this.StatusID)
            {
                SendStatusNotification();
            }
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void SendStatusNotification()
        {
            string templateName = "ProjectTask_" + this.Status.SysName;
            SendNotification(templateName);
        }

        public void SendNotification(string TemplateName)
        {
            User responsible = this.UserResponsible;
            Employee employee = this.Employee;
            List<string> emails = new List<string>();
            string empemail = employee != null ? employee.GetEmails() : string.Empty;

            if (responsible != null && responsible.Email.IsNotNullOrEmpty())
                emails.Add(responsible.Email);

            if (empemail.IsNotNullOrEmpty())
                emails.Add(empemail);

            EmailHelper emailHelper = new EmailHelper();
            EmailTemplate template = Settings.GetEmailTemplate(TemplateName);
            if (template.Body.IsNullOrEmpty() || !emails.Any())
                return;

            DynamicDocuments.DataProvider dp = new Models.DynamicDocuments.DataProvider()
            {
                Project = this.Project,
                Number = this.ID.ToString(),
                User = this.UserResponsible,
                Data = new
                {
                    User = this.UserResponsible,
                    Task = this,
                    Employee = this.Employee,
                    Status = this.Status
                }
            };

            try
            {
                string mailSubject = DynamicDocumentGenerator.Generator.GenerateText(template.Subject, dp);
                string mailBody = DynamicDocumentGenerator.Generator.GenerateText(template.Body, dp);

                emailHelper.SendEmail(mailSubject, mailBody, string.Join(";", emails.Distinct()));
            }
            catch (Exception ex)
            {
                new Log().Error(ex);
            }
        }

        public ProjectTask Duplicate()
        {
            return new ProjectTask()
            {
                //DateBegin = this.DateBegin,
                //DateEndPlan = this.DateEndPlan,
                ResponsibleID = this.ResponsibleID,
                TypeID = this.TypeID,
                Name = this.Name,
                EmployeeID = this.EmployeeID,
                OrderNumber = this.OrderNumber
            };
        }

        //public void UpdateNextTasks(List<ProjectTask> UpdatedTasks = null)
        //{
        //    if (!DateEnd.HasValue && !DateEndPlan.HasValue)
        //        return;
        //    DateTime date = DateEnd.HasValue ? DateEnd.Value : DateEndPlan.Value;
        //    UpdatedTasks = UpdatedTasks ?? new List<ProjectTask>();
        //    List<ProjectTask> tasks = NextTasks.ToList();
        //    foreach (ProjectTask task in tasks)
        //    {
        //        if (task.Completed || UpdatedTasks.Contains(task))
        //            continue;
        //        DateTime? oldDateEnd = task.DateEndPlan;

        //        UpdatedTasks.Add(task);
        //        int diff = 0;
        //        if (!task.DateBegin.HasValue)
        //        {
        //            task.DateBegin = date;
        //        }
        //        diff = (date - task.DateBegin.Value).Days;

        //        task.DateBegin = date;
        //        if (task.DateEndPlan.HasValue)
        //        {
        //            task.DateEndPlan = task.DateEndPlan.Value.AddDays(diff);
        //        }
        //        else if (task.TypeID.HasValue && task.Type.Duration.HasValue)
        //        {
        //            task.DateEndPlan = date.AddDays(task.Type.Duration.Value);
        //        }
        //        //if (oldDateEnd != task.DateEndPlan)
        //        task.UpdateNextTasks(UpdatedTasks);
        //    }
        //}

    }
}