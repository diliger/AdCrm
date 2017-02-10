using System;
using System.Collections.Generic;
using System.Data;
using System.Data.EntityClient;
using System.Data.Objects;
using System.Linq;
using System.Web;
using AdCrm.Properties;

namespace AdCrm.Models
{
    public partial class BuildingEntities
    {
        public const int FrozenAfter = 5;

        public bool HasChanges
        {
            get
            {
                return this.ObjectStateManager.GetObjectStateEntries(EntityState.Added | EntityState.Deleted | EntityState.Modified).Any();
            }
        }

        public User CurrentUser
        {
            get
            {
                try
                {
                    if (HttpContext.Current == null || HttpContext.Current.Request == null || HttpContext.Current.Request.RequestContext == null)
                        return null;
                    return HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser();
                }
                catch
                {
                }
                return null;
            }
            set
            {
                HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser(value);
            }
        }

        private Employee _CurrentEmployee;
        public Employee CurrentEmployee
        {
            get
            {
                int uID = CurrentUser.ID;
                if (_CurrentEmployee == null)
                {
                    _CurrentEmployee = this.Employees.FirstOrDefault(val => val.UserID == uID);
                }
                return _CurrentEmployee;
            }
        }

        public override int SaveChanges(System.Data.Objects.SaveOptions options)
        {
            List<ObjectStateEntry> entries = this.ObjectStateManager.GetObjectStateEntries(System.Data.EntityState.Added | System.Data.EntityState.Deleted | System.Data.EntityState.Modified).ToList();

            foreach (ObjectStateEntry e in entries)
            {
                SetCreateChange(e);
                //RaiseEvents(e);
            }

            return base.SaveChanges(options);
        }

        protected void SetCreateChange(ObjectStateEntry Entry)
        {
            ICreateEdit entity = Entry.Entity as ICreateEdit;

            if (entity == null)
            {
                return;
            }

            User user = null;

            if (HttpContext.Current != null && HttpContext.Current.Request.IsAuthenticated)
            {
                user = this.CurrentUser;
            }

            if (Entry.State == System.Data.EntityState.Added)
            {
                entity.CreateDate = DateTime.Now;

                if (user != null)
                {
                    entity.Creator = user.Login;
                }
                else if (entity.Creator.IsNullOrEmpty())
                {
                    entity.Creator = "anonym";
                }
            }
            else if (Entry.State == System.Data.EntityState.Modified)
            {
                entity.ChangeDate = DateTime.Now;

                if (user != null)
                {
                    entity.Changer = user.Login;
                }
                else
                {
                    entity.Changer = "anonym";
                }
            }
        }


        public enum ContractRolesEnum
        {
            /// <summary>
            /// Договор с заказчиком
            /// </summary>
            WithCustomer = 1,
            /// <summary>
            /// Договор с субподрядчиком
            /// </summary>
            WithSubcontractor,
            /// <summary>
            /// Рамочный договор с заказчиком
            /// </summary>
            WithCustomerFrame
        }

        public enum PaymentRolesEnum
        {
            /// <summary>
            /// Платеж от заказчика
            /// </summary>
            FromCustomer = 1,
            /// <summary>
            /// Платеж субподрядчику
            /// </summary>
            ToSubcontractor
        }

        public enum DaysFromTypesEnum
        {
            /// <summary>
            /// От даты заключения Договора
            /// </summary>
            ContractSign,
            /// <summary>
            /// От даты Аванса
            /// </summary>
            AdvanceDate
        }

        public enum ExpenseCategoriesEnum
        {
            EmployeeWork = 1,
            Transport
        }

        public enum ContractorTypesEnum
        {
            Person = 1,
            Company
        }

        public enum ContractorRolesEnum
        {
            Customer = 1,
            Subcontractor,
            Contractor,
            Specialist
        }

        public enum ProjectFileCategoriesEnum
        {
            /// <summary>
            /// Входящие
            /// </summary>
            Income = 1,
            /// <summary>
            /// Подготовительные
            /// </summary>
            Preparing,
            /// <summary>
            /// Согласованные
            /// </summary>
            Consistent,
            /// <summary>
            /// Авто-сгенерированные
            /// </summary>
            Generated
        }

        public static void RepeatIncidentsAsync()
        {
            new System.Threading.Thread(new System.Threading.ThreadStart(() =>
            {
                BuildingEntities db = new BuildingEntities();
                db.RepeatIncidents();
                db.SaveChanges();
                db.Dispose();
            })).Start();
        }

        public void RepeatIncidents()
        {
            SystemSetting setting = this.SystemSettings.FirstOrDefault(val => val.Name == "RepeatIncidents");
            DateTime date = DateTime.Now;
            //DateTime lastUpdate;

            List<Incident> incidentsToRepeat;

            if (setting == null)
            {
                setting = new SystemSetting() { Date = date, Name = "RepeatIncidents", Public = false, Title = "RepeatIncidents", Value = date.ToShortDateString() };
                this.SystemSettings.AddObject(setting);
            }
            //else if (DateTime.TryParse(setting.Value, out lastUpdate) && (date - lastUpdate).Days == 0)
            //{
            //    return;
            //}

            incidentsToRepeat = this.Incidents.Where(val => val.Repeat && !val.SecondaryID.HasValue && val.Date < date).ToList();
            foreach (Incident inc in incidentsToRepeat)
            {
                RepeatInterval interval = inc.RepeatType;
                DateTime repeatDate = inc.Date.AddDays(interval.Days).AddMonths(interval.Months).AddYears(interval.Years);
                DateTime? remindDate = null;
                if (repeatDate.AddDays(-1 * interval.BeforeDays) > date)
                {
                    continue;
                }
                if (inc.RemindDate.HasValue)
                {
                    remindDate = repeatDate.AddDays(-1 * (inc.Date - inc.RemindDate.Value).TotalDays);
                }

                Incident repeat = new Incident()
                {
                    CompanyID = inc.CompanyID,
                    CreatorID = inc.CreatorID,
                    Date = repeatDate,
                    ForRoleID = inc.ForRoleID,
                    TypeID = inc.TypeID,
                    Visible = inc.Visible,
                    RepeatTypeID = inc.RepeatTypeID,
                    ForUserID = inc.ForUserID,
                    Name = inc.Name,
                    PrimaryID = inc.ID,
                    Remind = inc.Remind,
                    Repeat = inc.Repeat,
                    RemindTime = inc.RemindTime,
                    RemindDate = remindDate
                };
                this.Incidents.AddObject(repeat);
                inc.SecondaryIncident = repeat;
            }

            setting.Value = date.ToShortDateString();
        }
    }

    public enum RefbookTypesEnum
    {
        StageCategories = 1,
        ContactPersonTypes = 2,
        ContractorNoteTypes = 3
    }

    public enum RolesEnum
    {
        Admin = 1,
        Boss,
        Manager,
        Employee,
        Watcher,
        Client
    }

    public class StatbookTypesEnum
    {
        public const int WalletTypes = 1;
        public const int Genders = 2;
        public const int TaskStatuses = 3;
        public const int Reports = 4;
        public const int TaskPriorities = 5;
        public const int TaskTurns = 6;
        public const int TaskVisibilities = 7;
    }

    public class WalletTypesEnum
    {
        public const int EmployeeWallet = 101;
        public const int CompanyWallet = 102;
        public const int InvoiceWallet = 103;
    }

    public class TaskStatusesEnum
    {
        public const int New = 301;
        public const int Discussion = 302;
        public const int ToDo = 303;
        public const int InProgress = 304;
        public const int ToTest = 305;
        public const int Completed = 306;
    }

    public class TaskPrioritiesEnum
    {
        public const int Critical = 501;
        public const int Urgent = 502;
        public const int Important = 503;
        public const int Normal = 504;
        public const int Low = 504;
    }

    public class TaskTurnsEnum
    {
        public const int Executor = 601;
        public const int Customer = 602;
        public const int ThirdParty = 603;
    }

    public class TaskVisibilitiesEnum
    {
        public const int Visible = 701;
        public const int Hidden = 702;
    }

    //public class DispatchStatusesEnum
    //{
    //    public const int Await = 501;
    //    public const int Progress = 502;
    //    public const int Dispatched = 503;
    //}

    public class ProjectStatusesEnum
    {
        public const int Hidden = 8;
    }

    public class ContractorTypesEnum
    {
        /// <summary>
        /// Физическое лицо
        /// </summary>
        public const int Person = 1;
        /// <summary>
        /// Юридическое лицо
        /// </summary>
        public const int Company = 2;
    }

    public class PaymentRolesEnum
    {
        /// <summary>
        /// Платеж от заказчика
        /// </summary>
        public const int FromCustomer = 1;

        /// <summary>
        /// Платеж субподрядчику
        /// </summary>
        public const int ToSubcontractor = 2;
    }

    public class ReportsEnum
    {
        public const int SalaryReport = 401;
        public const int GainReport = 402;
        public const int InvoicesReport = 403;
        public const int TasksReport = 404;
    }
}