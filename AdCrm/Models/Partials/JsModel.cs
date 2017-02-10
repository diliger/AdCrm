//using System.Linq.Dynamic;
using EntityJs.Client;
using EntityJs.Client.Events;
using System;
using System.Collections.Generic;
using System.Data.Objects;
using System.Linq;
using System.Reflection;
using System.Web;

namespace AdCrm.Models
{
    public class JsModel : EntityModel<ObjectContext>
    {
        protected List<EntityEventArgs> updatedEntities = new List<EntityEventArgs>();
        protected List<EntityEventArgs> deletedEntities = new List<EntityEventArgs>();

        public JsModel(ObjectContext Context)
            : base(Context)
        {
            modelNamespace = "AdCrm.Models";
            ModelEvents.Inserting += ModelEvents_Inserting;
            ModelEvents.Updating += ModelEvents_Updating;
            ModelEvents.Inserted += ModelEvents_Inserted;
            ModelEvents.Updated += ModelEvents_Updated;
            ModelEvents.Deleted += ModelEvents_Deleted;
            ModelEvents.DataSaved += ModelEvents_DataSaved;
            ModelEvents.CheckPermission += ModelEvents_CheckPermission;
            FillOrderMethods();
            FillWhereMethods();
        }

        public new BuildingEntities EntityContext
        {
            get
            {
                return base.EntityContext as BuildingEntities;
            }
        }

        public User CurrentUser
        {
            get
            {
                return HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();
            }
        }

        protected void FillWhereMethods()
        {
            //this.WhereMethods.Add("", (q, prms) =>
            //{
            //    Type elementType = (q as IQueryable).ElementType;
            //    PropertyInfo piCompanyID = elementType.GetProperty("CompanyID");
            //    if (piCompanyID != null)
            //    {
            //        return q.Where("it.CompanyID = " + CurrentUser.CompanyID);
            //    }
            //    return q;
            //});
        }

        protected void FillOrderMethods()
        {

        }

        public override bool GetWhereParameter(string EntityName, string Parameter, out string NewParameter)
        {
            Dictionary<string, string> parameters = new Dictionary<string, string>();
            string key = EntityName + "." + Parameter;

            parameters.Add("Incident.Read", "true{condition} && it.IncidentUsers.Any(it.Done&&it.UserID==" + CurrentUser.ID + ") || false{condition} && !it.IncidentUsers.Any(it.Done&&it.UserID==" + CurrentUser.ID + ") ");
            parameters.Add("Incident.IncidentUser", "it.IncidentUsers.Any(it.Custom&&it.UserID{condition})");
            parameters.Add("User.FullName", "((it.Surname == null ? \"\" : it.Surname + \" \") + (it.Name == null ? \"\" : it.Name + \" \") + (it.Patronymic == null ? \"\" : it.Patronymic + \" \")).Trim()");
            parameters.Add("Project.ResponsibleName", "((it.UserResponsible.Surname == null ? \"\" : it.UserResponsible.Surname + \" \") + (it.UserResponsible.Name == null ? \"\" : it.UserResponsible.Name + \" \") + (it.UserResponsible.Patronymic == null ? \"\" : it.UserResponsible.Patronymic + \" \")).Trim()");
            parameters.Add("Project.StatusName", "it.Status != null ? it.Status.Name : \"\" ");
            parameters.Add("Employee.FullName", "((it.Surname == null ? \"\" : it.Surname + \" \") + (it.Name == null ? \"\" : it.Name + \" \") + (it.Patronymic == null ? \"\" : it.Patronymic + \" \")).Trim()");
            parameters.Add("ProjectEmployee.EmployeeName", "((it.Employee.Surname == null ? \"\" : it.Employee.Surname + \" \") + (it.Employee.Name == null ? \"\" : it.Employee.Name + \" \") + (it.Employee.Patronymic == null ? \"\" : it.Employee.Patronymic + \" \")).Trim()");

            parameters.Add("Invoice.PaidAmount", "(!it.Payments.Any() ? 0 : it.Payments.Sum(it.Sum))");

            parameters.Add("Wallet.ForEmployeeExpense", "it.EmployeeID{condition} || it.EmployeeWallets.Any(it.EmployeeID{condition}&&it.Expense)");

            parameters.Add("Transfer.WalletFromAvailable", "it.WalletFrom.EmployeeID{condition} || it.WalletFrom.EmployeeWallets.Any(it.EmployeeID{condition}&&it.TransferFrom)");
            parameters.Add("Transfer.WalletToAvailable", "it.WalletTo.EmployeeID{condition} || it.WalletTo.EmployeeWallets.Any(it.EmployeeID{condition}&&it.TransferTo)");

            parameters.Add("Project.ManagerFeeAmount", "((it.ProjectWorks.Any() ? it.ProjectWorks.Sum(it.Cost * 118 / 100 - (it.ContractorExists ? it.CostContractor : 0)) : 0) - " +
                "(it.Expenses.Any(!it.EmployeeID.HasValue || it.Employee.UserID != it.Project.ResponsibleID || !it.Type.ManagerFee) ? it.Expenses.Where(!it.EmployeeID.HasValue || it.Employee.UserID != it.Project.ResponsibleID || !it.Type.ManagerFee).Sum(it.Sum) : 0)) / 118 * it.ManagerFee");
            parameters.Add("Project.ManagerFeePaid", "it.Expenses.Any(it.Employee.UserID == it.Project.ResponsibleID && it.Type.ManagerFee) ? it.Expenses.Where(it.Employee.UserID == it.Project.ResponsibleID && it.Type.ManagerFee).Sum(it.Sum) : 0");

            parameters.Add("Project.ManagerDebt", string.Format("(it.ProjectStages.Any(it.WorkStage.ManagerFee) ? ({0})-({1}) : 0)", parameters["Project.ManagerFeeAmount"], parameters["Project.ManagerFeePaid"]));
            parameters.Add("Project.FullName", "it.ParentID.HasValue ? it.ParentProject.Name + \" - \" + it.Name : it.Name");

            parameters.Add("Contractor.ForProject", "it.ProjectWorks.Any(it.ContractorExists && it.ProjectID{condition})");
            parameters.Add("ProjectTask.Completed", "it.StatusID == " + TaskStatusesEnum.Completed);
            parameters.Add("ProjectTask.Overdue", "it.StatusID != " + TaskStatusesEnum.Completed + "&& SqlFunctions.DateDiff(\"DAY\", it.DateEndPlan, DateTime.Now) > 0");
            parameters.Add("ProjectTask.ProjectName", "it.Project.ParentID.HasValue ? it.Project.ParentProject.Name + \" - \" + it.Project.Name : it.Project.Name");
            parameters.Add("Expense.ProjectName", "it.Project.ParentID.HasValue ? it.Project.ParentProject.Name + \" - \" + it.Project.Name : it.Project.Name");


            if (CurrentUser.RoleID == (int)RolesEnum.Employee)
            {
                parameters.Add("Wallet.Name", "it.EmployeeID == " + CurrentUser.EmployeeID + " ? \"" + Wallet.PersonalName + "\" : it.Name");
            }
            if (Parameter.EndsWith("Employee.FullName"))
            {
                string p = Parameter.Replace("Employee.FullName", "");
                string str = parameters["Employee.FullName"];
                str = str.Replace("it.", "it." + p + "Employee.");
                parameters.Add(key, str);
            }

            if (parameters.ContainsKey(key))
            {
                NewParameter = parameters[key];
                return true;
            }

            return base.GetWhereParameter(EntityName, Parameter, out NewParameter);
        }

        public override bool GetOrderParameter(string EntityName, string Parameter, out string NewParameter)
        {
            Dictionary<string, string> parameters = new Dictionary<string, string>();
            string key = EntityName + "." + Parameter;

            //parameters.Add("Incident.Read", "true{condition} && it.IncidentUsers.Any(it.Done&&it.UserID==" + CurrentUser.ID + ") || false{condition} && !it.IncidentUsers.Any(it.Done&&it.UserID==" + CurrentUser.ID + ") ");
            //parameters.Add("Incident.IncidentUser", "it.IncidentUsers.Any(it.Custom&&it.UserID{condition})");
            parameters.Add("Project.ResponsibleName", "((it.UserResponsible.Surname == null ? \"\" : it.UserResponsible.Surname + \" \") + (it.UserResponsible.Name == null ? \"\" : it.UserResponsible.Name + \" \") + (it.UserResponsible.Patronymic == null ? \"\" : it.UserResponsible.Patronymic + \" \")).Trim()");
            parameters.Add("User.FullName", "((it.Surname == null ? \"\" : it.Surname + \" \") + (it.Name == null ? \"\" : it.Name + \" \") + (it.Patronymic == null ? \"\" : it.Patronymic + \" \")).Trim()");
            parameters.Add("Employee.FullName", "((it.Surname == null ? \"\" : it.Surname + \" \") + (it.Name == null ? \"\" : it.Name + \" \") + (it.Patronymic == null ? \"\" : it.Patronymic + \" \")).Trim()");
            parameters.Add("Project.ManagerFeeAmount", "((it.ProjectWorks.Any() ? it.ProjectWorks.Sum(it.Cost * 118 / 100 - (it.ContractorExists ? it.CostContractor : 0)) : 0) - " +
                "(it.Expenses.Any(!it.EmployeeID.HasValue || it.Employee.UserID != it.Project.ResponsibleID || !it.Type.ManagerFee) ? it.Expenses.Where(!it.EmployeeID.HasValue || it.Employee.UserID != it.Project.ResponsibleID || !it.Type.ManagerFee).Sum(it.Sum) : 0)) / 118 * it.ManagerFee");
            parameters.Add("Project.ManagerFeePaid", "it.Expenses.Any(it.Employee.UserID == it.Project.ResponsibleID && it.Type.ManagerFee) ? it.Expenses.Where(it.Employee.UserID == it.Project.ResponsibleID && it.Type.ManagerFee).Sum(it.Sum) : 0");
            parameters.Add("ProjectEmployee.EmployeeName", "((it.Employee.Surname == null ? \"\" : it.Employee.Surname + \" \") + (it.Employee.Name == null ? \"\" : it.Employee.Name + \" \") + (it.Employee.Patronymic == null ? \"\" : it.Employee.Patronymic + \" \")).Trim()");
            parameters.Add("ProjectTask.Completed", "it.StatusID == " + TaskStatusesEnum.Completed);
            parameters.Add("ProjectTask.Overdue", "it.StatusID != " + TaskStatusesEnum.Completed + " && SqlFunctions.DateDiff(\"DAY\", it.DateEndPlan, DateTime.Now) > 0");
            parameters.Add("ProjectTask.ProjectName", "it.Project.ParentID.HasValue ? it.Project.ParentProject.Name + \" - \" + it.Project.Name : it.Project.Name");
            parameters.Add("Expense.ProjectName", "it.Project.ParentID.HasValue ? it.Project.ParentProject.Name + \" - \" + it.Project.Name : it.Project.Name");
            parameters.Add("Project.FullName", "it.ParentID.HasValue ? it.ParentProject.Name + \" - \" + it.Name : it.Name");
            parameters.Add("Invoice.PaidAmount", "(!it.Payments.Any() ? 0 : it.Payments.Sum(it.Sum))");
            //parameters.Add("Project.ManagerDebt", "it.ManagerFee");
            //var p = new Project();
            //var debt = ((p.ProjectWorks.Any() ? p.ProjectWorks.Sum(val => val.Cost * 118 / 100 - (val.ContractorExists ? val.CostContractor : 0)) : 0) - (p.Expenses.Any() ? p.Expenses.Sum(val => val.Sum) : 0)) / 118 * p.ManagerFee 
            //    - (p.Expenses.Any(val => val.EmployeeID.HasValue && val.Employee.UserID == p.ResponsibleID && val.Type.ManagerFee) ? p.Expenses.Where(val => val.EmployeeID.HasValue && val.Employee.UserID == p.ResponsibleID && val.Type.ManagerFee).Sum(val => val.Sum) : 0);

            if (CurrentUser.RoleID == (int)RolesEnum.Employee)
            {
                parameters.Add("Wallet.Name", "it.EmployeeID == " + CurrentUser.EmployeeID + " ? \"" + Wallet.PersonalName + "\" : it.Name");
            }
            if (Parameter.EndsWith("Employee.FullName"))
            {
                string p = Parameter.Replace("Employee.FullName", "");
                string str = parameters["Employee.FullName"];
                str = str.Replace("it.", "it." + p + "Employee.");
                parameters.Add(key, str);
            }

            if (parameters.ContainsKey(key))
            {
                NewParameter = parameters[key];
                return true;
            }

            return base.GetOrderParameter(EntityName, Parameter, out NewParameter);
        }

        void ModelEvents_CheckPermission(object sender, CheckPermissionsEventArgs e)
        {
            if (e.Cancel)
            {
                return;
            }

            if (CurrentUser.RoleID < (int)RolesEnum.Manager || e.EntityName == "UserSetting" || e.EntityName == "User" || e.EntityName == "Incident")
            {
                e.Cancel = false;
            }
            else if (CurrentUser.RoleID == (int)RolesEnum.Manager)
            {
                //if (e.Action != ActionsEnum.Select)
                //{
                //    string[] allowed = new[] { "EmployeePayments", "Expenses" };
                //    e.Cancel = !allowed.Contains(e.EntitySetName);
                //}
                //else
                //{
                //    e.Cancel = false;
                //}
            }
            else if (CurrentUser.RoleID == (int)RolesEnum.Employee)
            {
                if (e.EntityName == "User")
                {
                    User user = e.Entity as User;
                    e.Cancel = e.Action > ActionsEnum.Edit || e.Action == ActionsEnum.Edit && user.ID != CurrentUser.ID;
                }
                else if (e.EntityName == "Employee")
                {
                    Employee employee = e.Entity as Employee;
                    e.Cancel = e.Action > ActionsEnum.Edit || e.Action == ActionsEnum.Edit && employee.ID != CurrentUser.EmployeeID;
                }
                else if (e.EntityName == "Expense")
                {
                    Expense expense = e.Entity as Expense;
                    e.Cancel = e.Action != ActionsEnum.Insert && expense.EmployeeID != CurrentUser.EmployeeID;
                }
                else if (e.EntityName == "Transfer")
                { }
                else if (e.EntityName == "ProjectTask")
                { }
                else if (e.EntityName == "TaskType")
                { }
                else if (e.EntityName == "ProjectDispatch")
                { }
                else if (e.EntityName == "ProductDispatch")
                { }
                else if (e.EntityName == "ProjectProduct")
                { }
                else if (e.EntityName == "ProjectDispatchOrder")
                { }
                else if (e.Action == ActionsEnum.Select)
                {
                    string[] allowed = new[] { "Projects", "EmployeePayments", "ExpensePrices", "Wallets", "Products" };
                    e.Cancel = !allowed.Contains(e.EntitySetName);
                }
                else
                {
                    e.Cancel = true;
                }
            }
            else if (CurrentUser.RoleID == (int)RolesEnum.Client)
            {
                if (e.EntityName == "User")
                {
                    User user = e.Entity as User;
                    e.Cancel = e.Action > ActionsEnum.Edit || e.Action == ActionsEnum.Edit && user.ID != CurrentUser.ID || e.Action == ActionsEnum.Select && user.RoleID > (int)RolesEnum.Manager;
                }
                else if (e.EntityName == "ProjectTask")
                {
                    ProjectTask it = e.Entity as ProjectTask;
                    e.Cancel = it.Project.ContractorID != CurrentUser.ContractorID;
                }
                else if (e.EntityName == "Project")
                {
                    Project it = e.Entity as Project;
                    e.Cancel = (e.Action == ActionsEnum.Delete && it.CreatorID != CurrentUser.ID) || it.ContractorID != CurrentUser.ContractorID;
                }
                else if (e.EntityName == "Employee")
                {
                    Employee it = e.Entity as Employee;
                    e.Cancel = e.Action != ActionsEnum.Select || it.User != null && it.User.RoleID > (int)RolesEnum.Boss;
                }
            }
            else if (CurrentUser.RoleID >= (int)RolesEnum.Watcher)
            {
                e.Cancel = e.Action != ActionsEnum.Select;
            }
        }

        protected void ModelEvents_Updating(object sender, EntityEventArgs e)
        {
            PropertyInfo piChangeDate = e.Entity.GetType().GetProperty("ChangeDate");
            PropertyInfo piChangerID = e.Entity.GetType().GetProperty("ChangerID");
            if (piChangeDate != null)
            {
                piChangeDate.SetValue(e.Entity, DateTime.Now, null);
            }

            if (piChangerID != null)
            {
                piChangerID.SetValue(e.Entity, CurrentUser.ID, null);
            }
        }

        protected void ModelEvents_Inserting(object sender, EntityEventArgs e)
        {
            //PropertyInfo piCompanyID = e.Entity.GetType().GetProperty("CompanyID");
            PropertyInfo piChangeDate = e.Entity.GetType().GetProperty("ChangeDate");
            PropertyInfo piChangerID = e.Entity.GetType().GetProperty("ChangerID");

            PropertyInfo piCreateDate = e.Entity.GetType().GetProperty("CreateDate");
            PropertyInfo piCreatorID = e.Entity.GetType().GetProperty("CreatorID");

            //if (piCompanyID != null && CurrentUser != null)
            //{
            //    piCompanyID.SetValue(e.Entity, CurrentUser.CompanyID, null);
            //}

            if (piChangeDate != null)
            {
                piChangeDate.SetValue(e.Entity, DateTime.Now, null);
            }
            if (piChangerID != null && CurrentUser != null)
            {
                piChangerID.SetValue(e.Entity, CurrentUser.ID, null);
            }

            if (piCreateDate != null)
            {
                piCreateDate.SetValue(e.Entity, DateTime.Now, null);
            }
            if (piCreatorID != null && CurrentUser != null)
            {
                piCreatorID.SetValue(e.Entity, CurrentUser.ID, null);
            }
        }

        protected void ModelEvents_DataSaved(object sender, EventArgs e)
        {
            //AddHistory();
            List<Wallet> wallets = this.updatedEntities.Select(val => val.Entity).OfType<Wallet>().ToList();
            if (wallets.Any())
            {
                this.EntityContext.Refresh(RefreshMode.StoreWins, wallets);
            }
            this.updatedEntities.Clear();
            this.deletedEntities.Clear();
        }

        protected void ModelEvents_Updated(object sender, EntityEventArgs e)
        {
            this.updatedEntities.Add(e);
        }

        protected void ModelEvents_Inserted(object sender, EntityEventArgs e)
        {
            this.updatedEntities.Add(e);
        }

        protected void ModelEvents_Deleted(object sender, EntityEventArgs e)
        {
            this.deletedEntities.Add(e);
        }

    }
}