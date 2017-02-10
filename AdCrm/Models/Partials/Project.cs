using EntityJs.Client.Objects;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AdCrm.Models
{
    public partial class Project : IEntity, IEntityCustomSelect
    {
        public DateTime StartDate
        {
            get
            {
                DateTime result = CreateDate;
                if (DateSign.HasValue)
                {
                    result = result < DateSign ? result : DateSign.Value;
                }
                if (Expenses.Any())
                {
                    DateTime workDate = Expenses.Min(val => val.Date);
                    result = result < workDate ? result : workDate;
                }
                return result;
            }
        }

        public DateTime EndDate
        {
            get
            {
                List<DateTime> dates = new List<DateTime>();

                if (Payments.Any())
                {
                    dates.Add(Payments.Max(val => val.Date));
                }

                if (Expenses.Any())
                {
                    dates.Add(Expenses.Max(val => val.Date));
                }

                if (Archived && ArchiveDate.HasValue)
                {
                    dates.Add(ArchiveDate.Value);
                }
                else
                {
                    dates.Add(DateTime.Now);
                }

                return dates.Max();
            }
        }

        public bool MissingContract
        {
            get
            {
                return Contracts.Any(val => !val.OriginalExists);
            }
        }

        public bool MissingAct
        {
            get
            {
                return Contracts.Any(val => !val.OriginalActsExist);
            }
        }

        public decimal Cost
        {
            get
            {
                return ProjectWorks.Any() ? ProjectWorks.Sum(val => val.Cost) : 0;//.ContractorExists && 100 - val.Factor > 0 ? val.Cost * 100 / (100 - val.Factor) : val.Cost) : 0;// CostFunc(this);
            }
        }

        public decimal IncomeSum
        {
            get
            {
                return this.Payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.FromCustomer).Sum(val => val.Sum);
            }
        }

        public decimal OutgoingSum
        {
            get
            {
                return this.Payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor).Sum(val => val.Sum);
            }
        }

        public decimal WorksCost
        {
            get
            {
                return ProjectWorks.Any() ? ProjectWorks.Sum(val => val.ContractorExists ? val.CostContractor : 0) : 0;
                //var query = this.ProjectWorks.Where(val => val.ContractorExists);
                //return query.Any() ? query.Sum(val => val.Cost) : 0;
            }
        }

        public decimal ExpensesSum
        {
            get
            {
                return this.Expenses.Any() ? this.Expenses.Sum(val => val.Sum) : 0;
            }
        }

        //public decimal KickbackSum
        //{
        //    get
        //    {
        //        return ProjectWorks.Any() ? ProjectWorks.Sum(val => val.KickbackSum) : 0;
        //    }
        //}

        public Payment AdvancePayment
        {
            get
            {
                return Payments.FirstOrDefault(val => val.IsAdvance && val.RoleID == (int)BuildingEntities.PaymentRolesEnum.FromCustomer);
            }
        }

        public decimal InvoicesDebt
        {
            get
            {
                return this.Invoices.Sum(val => val.LeftAmount);
            }
        }

        public decimal ManagerFeeAmount
        {
            get
            {
                decimal expSum = this.Expenses.Any(val => !val.EmployeeID.HasValue || val.Employee.UserID != this.ResponsibleID || !val.Type.ManagerFee) ?
                    this.Expenses.Where(val => !val.EmployeeID.HasValue || val.Employee.UserID != this.ResponsibleID || !val.Type.ManagerFee).Sum(val => val.Sum) : 0;
                decimal result = mString.RemoveVat(this.Cost - this.WorksCost - expSum) / 100 * this.ManagerFee;
                return result;
            }
        }

        public decimal ManagerFeePaid
        {
            get
            {
                var query = this.Expenses.Where(val => val.EmployeeID.HasValue && val.Employee.UserID == this.ResponsibleID && val.Type.ManagerFee);
                decimal result = query.Any() ? query.Sum(val => val.Sum) : 0;
                return result;
            }
        }

        public string ParentName
        {
            get
            {
                return this.ParentProject != null ? this.ParentProject.Name : "";
            }
        }

        public string FullName
        {
            get
            {
                string pname = this.ParentName;
                return pname.IsNullOrEmpty() ? this.Name : pname + " - " + this.Name;
            }
        }

        partial void OnArchivedChanged()
        {
            if (Archived)
            {
                ArchiveDate = DateTime.Now;
            }
            else
            {
                ArchiveDate = null;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.Address,
                this.Archived,
                this.ArchiveDate,
                this.ChangeDate,
                this.ChangerID,
                this.Comments,
                this.ContractorID,
                this.Cost,
                this.WorksCost,
                this.CreateDate,
                this.CreatorID,
                this.Deleted,
                this.ID,
                this.Name,
                this.IncomeSum,
                this.OutgoingSum,
                this.ContractID,
                this.DateEnd,
                this.DaysEnd,
                this.DaysFromTypeID,
                this.DaysTypeID,
                this.MissingAct,
                this.MissingContract,
                this.DateSign,
                this.ResponsibleID,
                this.ManagerFee,
                this.ExpensesSum,
                this.ParentID,
                this.SubcontractorID,
                this.StatusID,
                this.EmployeeID,
                this.TypeID,
                this.Number,
                this.Contacts,
                this.ParentName,
                this.FullName,
                this.Code,
                StatusName = Status != null ? Status.Name : "",
                ResponsibleName = UserResponsible != null ? UserResponsible.FullName : "",
                AdvanceDate = AdvancePayment == null ? "" : AdvancePayment.Date.ToShortDateString(),
                AdvanceSum = AdvancePayment == null ? "" : AdvancePayment.Sum.ToDecimalString(),
                TypeName = this.ProjectType != null ? this.ProjectType.Name : string.Empty,
                EmployeeName = this.Employee != null ? this.Employee.FullName : string.Empty
            };
        }

        public object ToJson(string EntityMode)
        {
            EntityMode = EntityMode.StringAndTrim().ToLower();
            if (EntityMode == "managerfee" || EntityMode == "details")
            {
                return new
                {
                    this.Address,
                    this.Archived,
                    this.ArchiveDate,
                    this.ChangeDate,
                    this.ChangerID,
                    this.Comments,
                    this.ContractorID,
                    this.Cost,
                    this.WorksCost,
                    this.CreateDate,
                    this.CreatorID,
                    this.Deleted,
                    this.ID,
                    this.Name,
                    this.IncomeSum,
                    this.OutgoingSum,
                    this.ContractID,
                    this.DateEnd,
                    this.DaysEnd,
                    this.DaysFromTypeID,
                    this.DaysTypeID,
                    this.MissingAct,
                    this.MissingContract,
                    this.DateSign,
                    this.ResponsibleID,
                    this.ManagerFee,
                    this.ExpensesSum,
                    this.ParentID,
                    this.SubcontractorID,
                    this.ManagerFeeAmount,
                    this.ManagerFeePaid,
                    this.StatusID,
                    this.EmployeeID,
                    this.TypeID,
                    this.Number,
                    this.Contacts,
                    this.FullName,
                    this.Code,
                    InvoicesDebt = this.InvoicesDebt,
                    ParentName = this.ParentProject != null ? this.ParentProject.Name : "отсутствует",
                    ResponsibleName = UserResponsible != null ? UserResponsible.FullName : "",
                    AdvanceDate = AdvancePayment == null ? "" : AdvancePayment.Date.ToShortDateString(),
                    AdvanceSum = AdvancePayment == null ? "" : AdvancePayment.Sum.ToDecimalString(),
                    TypeName = this.ProjectType != null ? this.ProjectType.Name : string.Empty,
                    EmployeeName = this.Employee != null ? this.Employee.FullName : string.Empty
                };
            }
            else if (EntityMode == "gainreport" || EntityMode == "invoicesreport" || EntityMode == "tasksreport")
            {
                Dictionary<string, object> result = new Dictionary<string, object>();
                result["ID"] = ID;
                result["Number"] = Number;
                result["Name"] = Name;
                result["FullName"] = FullName;
                result["DateEnd"] = DateEnd;
                result["CreateDate"] = CreateDate;
                result["DateSign"] = DateSign;
                result["Contacts"] = Contacts;
                result["Address"] = Address;
                result["Status"] = this.Status != null ? this.Status.ToJson() : null;
                result["StatusName"] = this.Status != null ? this.Status.Name : string.Empty;
                result["StatusID"] = this.StatusID;
                result["Code"] = this.Code;
                result["EmployeeName"] = this.Employee != null ? this.Employee.FullName : string.Empty;
                result["ResponsibleName"] = UserResponsible != null ? UserResponsible.FullName : "";
                result["ContractorName"] = Contractor != null ? Contractor.FullName : "";
                result["ContractorContacts"] = Contractor != null ? Contractor.ContactsToString() : "";
                return result;
            }
            return ToJson();
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            //e.Action == EntityJs.Client.Events.ActionsEnum.Delete && !this.ParentID.HasValue || 
            e.Cancel = StatusID == ProjectStatusesEnum.Hidden && user.RoleID != (int)RolesEnum.Admin;
            if (e.Cancel || this.Deleted)
            {
                return;
            }

            if (this.Archived && e.Action == EntityJs.Client.Events.ActionsEnum.Edit)
            {
                List<string> keys = e.Values.Keys.ToList();
                keys.ForEach(val =>
                {
                    if (val != "Archived" && val != "Deleted")
                    {
                        e.Values.Remove(val);
                    }
                });
            }
            if (user.RoleID == (int)RolesEnum.Client)
            {
                e.Cancel = (e.Action == EntityJs.Client.Events.ActionsEnum.Delete && this.CreatorID != user.ID) || this.ContractorID != user.ContractorID;
                //e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select || this.ContractorID != user.ContractorID;
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
            BuildingEntities db = (BuildingEntities)e.Context;
            if (e.Values.ContainsKey("ResponsibleID") && e.Values["ResponsibleID"].StringAndTrim().ToInt() > 0)
            {
                int id = e.Values["ResponsibleID"].StringAndTrim().ToInt();
                //this.ManagerFee = db.Users.FirstOrDefault(val => val.ID == id).ManagerFee;
            }
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (this.ResponsibleID == 0)// && (!e.Values.ContainsKey("ResponsibleID") || e.Values["ResponsibleID"] == null))
            {
                this.ResponsibleID = this.CreatorID;
            }
            //if (UserResponsible != null)
            //{
            //    this.ManagerFee = UserResponsible.ManagerFee;
            //}
            if (ParentID.HasValue)
            {
                Project parent = this.ParentProject ?? db.Projects.First(val => val.ID == ParentID);
                this.Address = parent.Address;
                this.ContractorID = parent.ContractorID;

                this.Number = parent.Number;
                this.EmployeeID = parent.EmployeeID;
                this.TypeID = this.TypeID ?? parent.TypeID;
            }
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            if (this.Deleted)
            {
                List<ProjectTask> tasks = this.ProjectTasks.ToList();
                List<ProjectNote> notes = this.ProjectNotes.ToList();
                List<Project> projects = this.ChildProjects.ToList();

                foreach (ProjectTask task in tasks)
                {
                    EntityJs.Client.Events.EntityEventArgs args = new EntityJs.Client.Events.EntityEventArgs(db, "ProjectTasks", "ProjectTask", task, EntityJs.Client.Events.ActionsEnum.Delete);
                    task.OnDeleting(args);
                    db.DeleteObject(task);
                    task.OnDeleted(args);
                }
                foreach (ProjectNote note in notes)
                {
                    EntityJs.Client.Events.EntityEventArgs args = new EntityJs.Client.Events.EntityEventArgs(db, "ProjectNotes", "ProjectNote", note, EntityJs.Client.Events.ActionsEnum.Delete);
                    note.OnDeleting(args);
                    db.DeleteObject(note);
                    note.OnDeleted(args);
                }
                foreach (Project project in projects)
                {
                    EntityJs.Client.Events.EntityEventArgs args = new EntityJs.Client.Events.EntityEventArgs(db, "Projects", "Project", project, EntityJs.Client.Events.ActionsEnum.Edit);
                    project.OnDeleting(args);
                    project.Deleted = true;
                    project.OnDeleted(args);
                }
            }
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public Project Duplicate()
        {
            Project old = this;
            DateTime date = DateTime.Now;
            //int diff = (date - old.StartDate).Days;
            Project project = new Project()
            {
                Name = old.Name,
                DateSign = date,
                CreateDate = date,
                ChangeDate = date,
                Address = old.Address,
                ContractorID = old.ContractorID,
                EmployeeID = old.EmployeeID,
                Number = old.Number,
                ResponsibleID = old.ResponsibleID,
                TypeID = old.TypeID
            };
            return project;
        }
    }
}