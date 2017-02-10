using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AdCrm.Models
{
    public partial class User : EntityJs.Client.Objects.IEntity
    {

        public string Created
        {
            get
            {
                return string.Format("{0:dd.MM.yyyy HH:mm} {1}", CreateDate, CreatorID.HasValue ? "(" + UserCreator.FullName + ")" : string.Empty);
            }
        }

        public string Changed
        {
            get
            {
                return ChangeDate != CreateDate ? string.Format("{0:dd.MM.yyyy HH:mm} {1}", ChangeDate, ChangerID.HasValue ? "(" + UserChanger.FullName + ")" : string.Empty) : string.Empty;
            }
        }

        public string ContractorName
        {
            get
            {
                return this.Contractor != null ? this.Contractor.Name : string.Empty;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.Blocked,
                this.ChangeDate,
                this.ChangerID,
                this.CreateDate,
                this.CreatorID,
                this.Deleted,
                this.Email,
                this.FullName,
                this.ID,
                this.LastLoginDate,
                this.Login,
                this.Name,
                this.Patronymic,
                this.Phone,
                this.RegistrationDate,
                this.RoleID,
                this.Surname,
                this.Password,
                this.Created,
                this.Changed,
                this.EmployeeID,
                this.ContractorID,
                this.ContractorName,
                EmployeeName = this.Employee != null ? this.Employee.FullName : ""
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            string login = e.Values.ContainsKey("Login") ? e.Values["Login"].StringAndTrim() : string.Empty;
            int employeeID = e.Values.ContainsKey("EmployeeID") ? e.Values["EmployeeID"].StringAndTrim().ToInt() : 0;

            switch (e.Action)
            {
                case EntityJs.Client.Events.ActionsEnum.Delete: e.Cancel = true; break;
                case EntityJs.Client.Events.ActionsEnum.Edit:
                    e.Values.Remove("Login");
                    e.Cancel = user.RoleID >= (int)AdCrm.Models.RolesEnum.Manager && user.ID != this.ID;
                    if (user.RoleID >= (int)RolesEnum.Manager)
                    {
                        e.Values.Remove("RoleID");
                        e.Values.Remove("EmployeeID");
                    }
                    break;
                case EntityJs.Client.Events.ActionsEnum.Insert: e.Cancel = user.RoleID >= (int)RolesEnum.Manager; break;
                case EntityJs.Client.Events.ActionsEnum.Select: e.Cancel = false; break;
            }

            if (!e.Cancel && db.Users.Any(val => val.Login.ToLower() == login.ToLower() && !val.Deleted && val.ID != this.ID))
            {
                e.Cancel = true;
                e.Errors.Add("{DuplicateLogin:'" + login + "'}");
            }

            //if (!e.Cancel && db.Users.Any(val => val.EmployeeID == employeeID && !val.Deleted && val.ID != this.ID))
            //{
            //    e.Cancel = true;
            //    e.Errors.Add("{DuplicateEmployee:'" + employeeID + "'}");
            //}
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
            RegistrationDate = DateTime.Now;
            LastLoginDate = DateTime.Now;
            //RoleID = (int)LanguageSchool.Models.SchoolEntities.RolesEnum.manager;
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
            if (e.Values.ContainsKey("Password") && e.Values["Password"].ToString() != Password)
            {
                e.Values["Password"] = e.Values["Password"].ToString().ToSha1Base64String();
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
            if (e.Values.ContainsKey("Password"))
            {
                Password = e.Values["Password"].ToString().ToSha1Base64String();
            }
            UpdateNames();
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            List<Employee> employees = db.Employees.Where(val => (this.EmployeeID.HasValue && val.ID == this.EmployeeID) || (val.UserID.HasValue && val.UserID == this.ID)).ToList();
            employees.ForEach(val =>
            {
                if (val.ID == this.EmployeeID)
                {
                    val.UserID = this.ID;
                }
                else
                {
                    val.UserID = null;
                }
            });
            UpdateNames();

            if (this.ID == db.CurrentUser.ID)
            {
                db.CurrentUser = this;
            }
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        private void UpdateNames()
        {
            string fn = this.FullName;
            if (fn.IsNullOrEmpty())
            {
                this.Surname = string.Empty;
                this.Name = string.Empty;
                this.Patronymic = string.Empty;
                return;
            }

            string[] values = fn.Split(" ");

            this.Surname = values[0];
            this.Name = values.Length > 1 ? values[1] : string.Empty;
            this.Patronymic = values.Length > 2 ? values[2] : string.Empty;
        }
    }
}