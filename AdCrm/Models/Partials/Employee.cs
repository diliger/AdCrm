using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class Employee : IEntity, IEntityCustomSelect
    {
        public string GetEmails()
        {
            List<string> result = new List<string>();
            if (this.Email.IsNotNullOrEmpty())
                result.Add(this.Email);
            if (this.User != null && this.User.Email.IsNotNullOrEmpty())
                result.Add(this.User.Email);
            return string.Join(";", result.Distinct());
        }

        public string FullName
        {
            get
            {
                List<string> parts = new List<string>();
                parts.Add(Surname);
                parts.Add(Name);
                parts.Add(Patronymic);
                return string.Join(" ", parts).Trim();
            }
        }

        public decimal Balance
        {
            get
            {
                return this.Wallet != null ? this.Wallet.Balance : 0;
            }
        }

        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.CreateDate,
                this.ID,
                this.DepartmentID,
                this.Surname,
                this.Name,
                this.Patronymic,
                this.FullName,
                this.PositionID,
                this.Deleted,
                this.Archived,
                this.ArchiveDate,
                this.Balance,
                this.PassportIssueDate,
                this.PassportIssuer,
                this.PassportNumber,
                this.PassportSerie,
                this.AddressLive,
                this.AddressRegistration,
                this.Phone,
                this.UserID,
                this.WalletID,
                this.Email,
                this.SalaryBalance,
                this.PictureID,
                PictureName = this.File != null ? this.File.Name : string.Empty,
                WalletName = this.Wallet != null ? this.Wallet.Name : string.Empty,
                DepartmentName = this.Department != null ? this.Department.Name : "",
                PositionName = this.Position != null ? this.Position.Name : "",
                UserLogin = this.User != null ? this.User.Login : ""
            };
        }

        public object ToJson(string EntityMode)
        {
            EntityMode = EntityMode.StringAndTrim().ToLower();
            if (EntityMode == "autocomplete")
            {
                return new
                {
                    this.FullName,
                    this.Deleted,
                    this.Archived,
                    this.ID
                };
            }
            else
            {
                return ToJson();
            }
        }

        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            User user = db.CurrentUser;
            if (user.RoleID <= (int)RolesEnum.Manager)
            {
                e.Cancel = false;
            }
            else if (user.RoleID == (int)RolesEnum.Employee)
            {
                string[] notAllowed = new[] { "DepartmentID", "PositionID", "Archived", "Deleted", "ArchiveDate", "UserID", "WalletID" };
                e.Cancel = user.EmployeeID != this.ID && (e.Action != EntityJs.Client.Events.ActionsEnum.Select || e.EntityMode.StringAndTrim().ToLower() != "autocomplete");
                foreach (string item in notAllowed)
                {
                    e.Values.Remove(item);
                }
            }
            else
            {
                e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select;
            }
            //int userID = e.Values.ContainsKey("UserID") ? e.Values["UserID"].StringAndTrim().ToInt() : 0;

            //if (!e.Cancel && db.Employees.Any(val => val.UserID == userID && val.ID != this.ID && !val.Deleted))
            //{
            //    e.Cancel = true;
            //    e.Errors.Add("{DuplicateUser:'" + userID + "'}");
            //}
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
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
            DateTime date = DateTime.Now;
            BuildingEntities db = (BuildingEntities)e.Context;
            int userID = db.CurrentUser.ID;
            Wallet wallet = new Wallet() { ChangeDate = date, ChangerID = userID, CreateDate = date, CreatorID = userID, EmployeeID = this.ID, Name = this.FullName, TypeID = WalletTypesEnum.EmployeeWallet };
            db.Wallets.AddObject(wallet);
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
            BuildingEntities db = (BuildingEntities)e.Context;
            List<User> users = db.Users.Where(val => (this.UserID.HasValue && val.ID == this.UserID) || (val.EmployeeID.HasValue && val.EmployeeID == this.ID)).ToList();
            users.ForEach(val =>
            {
                if (val.ID == this.UserID)
                {
                    val.EmployeeID = this.ID;
                }
                else
                {
                    val.EmployeeID = null;
                }

                if (val.ID == db.CurrentUser.ID)
                {
                    db.CurrentUser = val;
                }
            });

            UpdateSalaryBalance();
            if (this.Deleted && this.Wallet != null)
                this.Wallet.Deleted = true;
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void UpdateSalaryBalance()
        {
            decimal balance = this.SalaryExpenses.Where(val => val.Type.ForSalary).Sum(val => val.Sum) - this.Payrolls.Sum(val => val.Amount);
            if (this.SalaryBalance != balance)
                this.SalaryBalance = balance;
        }
    }
}