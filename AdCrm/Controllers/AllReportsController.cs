using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using AdCrm.Models;
using AdCrm.Helpers;
using System.Data.Objects.SqlClient;

namespace AdCrm.Controllers
{
    [CompressFilter]
    [Authorize(Roles = "admin,boss,manager,watcher")]
    public class AllReportsController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();
        User user
        {
            get
            {
                return HttpContext.CurrentUser();
            }
        }

        //
        // GET: /AllReports/

        public ActionResult WorkLogs()
        {
            string settingsName = "/AllReports/WorkLogs";
            int userID = user.ID;
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateFrom") == 0);
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateTo") == 0);

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.WorkLogs";
            return View();
        }

        public ActionResult WorkLogsJson(string DateFrom, string DateTo)
        {
            string settingsName = "/AllReports/WorkLogs";
            int userID = user.ID;
            List<Expense> expenses = new List<Expense>();
            object data;
            DateTime date1, date2;
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateFrom") == 0);
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateTo") == 0);

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }
            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            expenses = (from w in db.Expenses
                        where w.ProjectID.HasValue && !w.Project.Deleted && w.Type.CategoryID == (int)BuildingEntities.ExpenseCategoriesEnum.EmployeeWork &&
                     ((SqlFunctions.DateDiff("DAY", date1, w.Date) >= 0 && SqlFunctions.DateDiff("DAY", w.Date, date2) >= 0) //Если работа попадает в диапазон

                     || (SqlFunctions.DateDiff("DAY", (w.Project.DateSign < w.Project.CreateDate ? w.Project.DateSign : w.Project.CreateDate), date1) >= 0 //Если объект создан или договор подписан до начала период
                     && (!w.Project.ArchiveDate.HasValue || SqlFunctions.DateDiff("DAY", date1, w.Project.ArchiveDate) >= 1)) //Но был отправлен в архив после начала периода

                     || (SqlFunctions.DateDiff("DAY", date1, w.Project.CreateDate) >= 0 && SqlFunctions.DateDiff("DAY", w.Project.CreateDate, date2) >= 0) //Если объект был создан после начала периода и до конца периода
                     || (w.Project.DateSign.HasValue && SqlFunctions.DateDiff("DAY", date1, w.Project.DateSign) >= 0 && SqlFunctions.DateDiff("DAY", w.Project.DateSign, date2) >= 0)) //Если договор по объекту был подписан после начала периода и до конца периода
                        select w).ToList();

            var grouped = expenses.GroupBy(val => val.EmployeeID + "_" + val.ProjectID + "_" + val.Type.UnitName).ToList();

            data = new
            {
                WorkLogs = grouped.Select(group =>
                {
                    Expense w = group.First();
                    Project p = w.ProjectID.HasValue ? w.Project : null;
                    Employee e = w.EmployeeID.HasValue ? w.Employee : null;
                    var query = group.Where(val => (val.Date.Year > date1.Year || (val.Date.Year == date1.Year && val.Date.Month >= date1.Month)) &&
                        (val.Date.Year < date2.Year || (val.Date.Year == date2.Year && val.Date.Month <= date2.Month)));
                    return new
                    {
                        ID = w.ID,
                        ProjectID = w.ProjectID,
                        ProjectName = p != null ? p.Name : "",
                        DepartmentID = e != null ? e.DepartmentID.ToString() : "",
                        DepartmentName = e != null ? e.Department.Name : "",
                        PositionID = e != null ? e.PositionID.ToString() : "",
                        PositionName = e != null ? e.Position.Name.ToString() : "",
                        EmployeeID = w.EmployeeID,
                        EmployeeName = w.Employee.FullName,
                        UnitName = w.Type.UnitName,
                        Count = query.Any() ? query.Sum(val => val.Count) : 0,
                        CountTotal = group.Sum(val => val.Count)
                    };
                }).ToList()
            };

            return Json(data);
        }

        public ActionResult Debts(int ID)
        {
            string settingsName = "/AllReports/Debts";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateFrom") == 0);
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateTo") == 0);

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                ReportType = ID,
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.Debts." + (ID == 1 ? "FromCustomers" : "ToContractors");
            return View();
        }

        [HttpPost]
        public ActionResult DebtsJson(int ID, string DateFrom, string DateTo)
        {
            string settingsName = "/AllReports/Debts";
            int userID = user.ID;
            DateTime date1, date2;
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateFrom") == 0);
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateTo") == 0);

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }
            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            var query = from p in db.Projects
                        where !p.Deleted &&
                        ((SqlFunctions.DateDiff("DAY", (p.DateSign < p.CreateDate ? p.DateSign : p.CreateDate), date1) >= 0 //Если объект создан или договор подписан до начала период
                     && (!p.ArchiveDate.HasValue || SqlFunctions.DateDiff("DAY", date1, p.ArchiveDate) >= 1)) //И активный на данный момент или  был отправлен в архив после начала периода 

                     || (SqlFunctions.DateDiff("DAY", date1, p.CreateDate) >= 0 && SqlFunctions.DateDiff("DAY", p.CreateDate, date2) >= 0) //Если объект был создан после начала периода и до конца периода
                     || (p.DateSign.HasValue && SqlFunctions.DateDiff("DAY", date1, p.DateSign) >= 0 && SqlFunctions.DateDiff("DAY", p.DateSign, date2) >= 0)) //Если договор по объекту был подписан после начала периода и до конца периода)
                        select p;

            object data;
            if (ID == 1)
            {
                List<Project> projects = query.Where(val => (val.ProjectWorks.Any(val2 => val2.Cost > 0) && !val.Payments.Any(val2 => val2.RoleID == (int)BuildingEntities.PaymentRolesEnum.FromCustomer)) ||
                        ((val.ProjectWorks.Any() ?

                        val.ProjectWorks.Sum(val2 => val2.Cost * 118 / 100)

                        : 0) > val.Payments.Where(val2 => val2.RoleID == (int)BuildingEntities.PaymentRolesEnum.FromCustomer).Sum(val2 => val2.Sum))).ToList();

                data = projects.Select(val =>
                {
                    decimal incomeSum = val.Payments.Where(val2 => val2.RoleID == (int)BuildingEntities.PaymentRolesEnum.FromCustomer).Sum(val2 => val2.Sum);
                    return new
                        {
                            ID = val.ID,
                            ProjectID = val.ID,
                            ProjectName = val.Name,
                            Archived = val.Archived,
                            Cost = val.Cost,
                            PayedSum = incomeSum,
                            val.ContractorID,
                            ContractorName = val.ContractorID.HasValue ? val.Contractor.Name : "",
                            Debt = val.Cost - incomeSum
                        };
                });
            }
            else
            {
                //List<Project> projects = query.Where(project => project.ProjectWorks.Where(val => val.ContractorExists && val.ContractorID.HasValue).GroupBy(val => val.ContractorID).Any(val =>
                //    Math.Floor(val.Sum(w => w.Cost * 118 / 100 * (100 - w.Factor)) / 100) > 0 &&
                //    Math.Floor(val.Sum(w => w.Cost * 118 / 100 * (100 - w.Factor)) / 100) >
                //    (project.Payments.Any(p => p.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor && p.ContractorID == val.Key) ? project.Payments.Where(p => p.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor && p.ContractorID == val.Key).Sum(p => p.Sum) : 0)))
                //    .ToList();

                query = from project in query
                        let works = project.ProjectWorks.Where(val => val.ContractorExists && val.ContractorID.HasValue && Math.Floor(val.Cost * 118 / 100 * (100 - val.Factor) / 100) > 0).GroupBy(val => val.ContractorID).Select(val => new { ID = val.Key, Sum = Math.Floor(val.Sum(w => w.Cost * 118 / 100 * (100 - w.Factor)) / 100) })
                        let payments = project.Payments.Where(p => p.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor).GroupBy(val => val.ContractorID).Select(val => new { ID = val.Key, Sum = val.Sum(p => p.Sum) })
                        where works.Any(val => val.Sum != (payments.Any(p => p.ID == val.ID) ? payments.FirstOrDefault(p => p.ID == val.ID).Sum : 0))
                        select project;

                List<Project> projects = query.ToList();

                // query.Where(project => project.ProjectWorks.Where(val => val.ContractorExists && val.ContractorID.HasValue).GroupBy(val => val.ContractorID).Any(val =>
                //Math.Floor(val.Sum(w => w.Cost * 118 / 100 * (100 - w.Factor))) / 100 > 0 && Math.Floor(val.Sum(w => w.Cost * 118 / 100 * (100 - w.Factor)) / 100) - val.Sum(w => w.Payments.Any() ? w.Payments.Sum(val3 => val3.Sum) : 0) > 0)).ToList();

                //List<ProjectWork> works = query.SelectMany(val => val.ProjectWorks.Where(val2 => val2.ContractorExists && val2.ContractorID.HasValue &&
                //    (val2.Cost * 118 / 100 / 100 * (100 - val2.Factor) >= 0.01M && val2.Cost * 118 / 100 / 100 * (100 - val2.Factor) - (val2.Payments.Any() ? val2.Payments.Sum(val3 => val3.Sum) : 0) >= 0.01M))).ToList();

                var rows = projects.SelectMany(project => project.ProjectWorks.Where(val => val.ContractorExists && val.ContractorID.HasValue).GroupBy(val => val.Contractor)).ToList();

                data = rows.Select(row =>
                {
                    Contractor contractor = row.First().Contractor;
                    Project project = row.First().Project;
                    var pq = project.Payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor && val.ContractorID == contractor.ID);

                    decimal payedSum = pq.Any() ? pq.Sum(val2 => val2.Sum) : 0;
                    decimal cost = row.Sum(val => val.ContractorExists ? val.CostContractor : 0);
                    return new
                    {
                        project.ID,
                        ProjectID = project.ID,
                        ProjectName = project.Name,
                        Archived = project.Archived,
                        Cost = cost,
                        PayedSum = payedSum,
                        ContractorID = contractor.ID,
                        ContractorName = contractor.Name,
                        Debt = cost - payedSum
                    };
                }).Where(row => Math.Abs(row.Debt) >= 1).ToList();
            }

            return Json(data);
        }

        public ActionResult MissingDocuments()
        {
            string settingsName = "/AllReports/MissingDocuments";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateFrom") == 0);
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateTo") == 0);

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.MissingDocuments";
            return View();
        }

        [HttpPost]
        public ActionResult MissingDocumentsJson(string DateFrom, string DateTo)
        {
            string settingsName = "/AllReports/MissingDocuments";
            int userID = user.ID;
            List<Contract> contracts = new List<Contract>();
            object data;
            IQueryable<Project> query;
            List<Project> projects;
            DateTime date1, date2;
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateFrom") == 0);
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name.IndexOf(settingsName + "/DateTo") == 0);

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }
            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            query = from p in db.Projects
                    where !p.Deleted &&
                    ((SqlFunctions.DateDiff("DAY", (p.DateSign < p.CreateDate ? p.DateSign : p.CreateDate), date1) >= 0 //Если объект создан или договор подписан до начала период
                     && (!p.ArchiveDate.HasValue || SqlFunctions.DateDiff("DAY", date1, p.ArchiveDate) >= 1)) //И активный на данный момент или  был отправлен в архив после начала периода 

                     || (SqlFunctions.DateDiff("DAY", date1, p.CreateDate) >= 0 && SqlFunctions.DateDiff("DAY", p.CreateDate, date2) >= 0) //Если объект был создан после начала периода и до конца периода
                     || (p.DateSign.HasValue && SqlFunctions.DateDiff("DAY", date1, p.DateSign) >= 0 && SqlFunctions.DateDiff("DAY", p.DateSign, date2) >= 0)) //Если договор по объекту был подписан после начала периода и до конца периода)
                    select p;

            projects = query.Where(val => (val.ContractID.HasValue && (!val.Contract.OriginalExists || val.Contract.Acts.Any(val2 => !val2.OriginalExists)))
                || (val.ProjectWorks.Any(val2 => val2.ContractorExists && val2.ContractID.HasValue && (!val2.Contract.OriginalExists || val2.Contract.Acts.Any(val3 => !val3.OriginalExists))))).ToList();

            projects.ForEach(val => contracts.AddRange(GetMissingDocuments(val)));

            data = contracts.Select(val =>
            {
                DateTime? dateEnd = val.RoleID == (int)AdCrm.Models.BuildingEntities.ContractRolesEnum.WithCustomer ? val.Project.DateEnd : val.ProjectWorks.Min(work => work.DateEnd);
                return new
                    {
                        val.ID,
                        val.ContractorID,
                        val.ProjectID,
                        ContractorName = val.ContractorID.HasValue ? val.Contractor.Name : "",
                        ProjectName = val.Project.Name,
                        MissingContract = !val.OriginalExists,
                        MissingAct = !val.OriginalActsExist && dateEnd < DateTime.Now
                    };
            });

            return Json(data);
        }

        [Authorize(Roles = "admin,boss,watcher")]
        public ActionResult Gain()
        {
            string settingsName = "/AllReports/Gain";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                ReportID = ReportsEnum.GainReport,
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                ProjectStatuses = db.ProjectStatuses.ToList().Select(val => val.ToJson()).ToList(),
                ReportFilters = GetFilters(ReportsEnum.GainReport).Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.Gain";
            return View();
        }

        [HttpPost]
        [Authorize(Roles = "admin,boss,watcher")]
        public ActionResult GainJson(string DateFrom, string DateTo)
        {
            string settingsName = "/AllReports/Gain";
            int userID = user.ID;
            object data = null;
            decimal totalPayrolls, totalInvoices, totalExpenses;
            DateTime date1, date2;
            List<Project> projects;
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }

            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            projects = (from p in db.Projects
                        where !p.Deleted &&
                        ((SqlFunctions.DateDiff("DAY", (p.DateSign < p.CreateDate ? p.DateSign : p.CreateDate), date1) >= 0 //Если объект создан или договор подписан до начала период
                     && (!p.ArchiveDate.HasValue || SqlFunctions.DateDiff("DAY", date1, p.ArchiveDate) >= 1)) //И активный на данный момент или  был отправлен в архив после начала периода 

                     || (SqlFunctions.DateDiff("DAY", date1, p.CreateDate) >= 0 && SqlFunctions.DateDiff("DAY", p.CreateDate, date2) >= 0) //Если объект был создан после начала периода и до конца периода
                     || (p.DateSign.HasValue && SqlFunctions.DateDiff("DAY", date1, p.DateSign) >= 0 && SqlFunctions.DateDiff("DAY", p.DateSign, date2) >= 0)) //Если договор по объекту был подписан после начала периода и до конца периода)
                        select p).ToList();

            totalPayrolls = GetTotalPayrollsSum(date1, date2, null);
            totalInvoices = GetTotalInvoicesSum(date1, date2, null);
            totalExpenses = GetTotalExpensesSum(date1, date2, null);

            var rows = projects.Select(val =>
                    {
                        decimal invoicesSum = GetTotalInvoicesSum(date1, date2, val.ID);
                        decimal payrollsSum = GetTotalPayrollsSum(date1, date2, val.ID);
                        decimal expensesSum = GetTotalExpensesSum(date1, date2, val.ID);
                        //decimal gain = incomeSum - outgoingSum - expensesSum;
                        //decimal managerFee = gain.RemoveVat() / 100 * val.ManagerFee;

                        return new
                        {
                            val.ID,
                            val.FullName,
                            Project = val.ToJson("gainReport"),
                            Invoices = invoicesSum,
                            Payrolls = payrollsSum,
                            Expenses = expensesSum
                        };
                    }).ToList();

            data = new
            {
                TotalInvoices = totalInvoices,
                TotalPayrolls = totalPayrolls,
                TotalExpenses = totalExpenses,
                Rows = rows
            };

            return Json(data);
        }

        public ActionResult Expenses()
        {
            string settingsName = "/AllReports/Expenses";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.Expenses";
            return View();
        }

        [HttpPost]
        public ActionResult ExpensesJson(string DateFrom, string DateTo)
        {
            string settingsName = "/AllReports/Expenses";
            int userID = user.ID;
            object data = null;
            List<object> rows = new List<object>();
            DateTime date1, date2, tempDate;
            #region Dates and Settings
            List<DateTime> monthes = new List<DateTime>();
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }

            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            int count = (date2.Year - date1.Year) * 12 + date2.Month - date1.Month;
            tempDate = date1;
            while (monthes.Count <= count)
            {
                monthes.Add(new DateTime(tempDate.Year, tempDate.Month, 1));
                tempDate = tempDate.AddMonths(1);
            }
            #endregion

            List<Expense> expenses = db.Expenses
                .Where(val => (SqlFunctions.DatePart("YEAR", val.Date) > date1.Year || (SqlFunctions.DatePart("YEAR", val.Date) == date1.Year && SqlFunctions.DatePart("MONTH", val.Date) >= date1.Month))
                && (SqlFunctions.DatePart("YEAR", val.Date) < date2.Year || (SqlFunctions.DatePart("YEAR", val.Date) == date2.Year && SqlFunctions.DatePart("MONTH", val.Date) <= date2.Month))).OrderBy(val => val.Type.OrderNumber).ToList();

            List<Payment> payments = db.Payments.Where(val => (SqlFunctions.DatePart("YEAR", val.Date) > date1.Year || (SqlFunctions.DatePart("YEAR", val.Date) == date1.Year && SqlFunctions.DatePart("MONTH", val.Date) >= date1.Month))
                && (SqlFunctions.DatePart("YEAR", val.Date) < date2.Year || (SqlFunctions.DatePart("YEAR", val.Date) == date2.Year && SqlFunctions.DatePart("MONTH", val.Date) <= date2.Month))
                && val.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor).ToList();

            foreach (var g in expenses.OrderBy(val => val.Type.Name).GroupBy(val => val.TypeID))
            {
                Expense e = g.First();
                var query = new Func<int, int, IEnumerable<Expense>>((y, m) => g.Where(val => val.Date.Month == m && val.Date.Year == y));
                var item = new
                {
                    ID = e.TypeID,
                    Name = e.Type.Name,
                    Values = monthes.Select(m => query(m.Year, m.Month).Any() ? query(m.Year, m.Month).Sum(val => val.Sum) : 0).ToList(),
                    Total = g.Sum(val => val.Sum)
                };
                rows.Add(item);
            }

            if (payments.Any())
            {
                var query = new Func<int, int, IEnumerable<Payment>>((y, m) => payments.Where(val => val.Date.Month == m && val.Date.Year == y));
                var item = new
                {
                    ID = -1,
                    Name = "Субподряд",
                    Values = monthes.Select(m => query(m.Year, m.Month).Any() ? query(m.Year, m.Month).Sum(val => val.Sum) : 0).ToList(),
                    Total = payments.Sum(val => val.Sum)
                };
                rows.Add(item);
            }
            data = new
            {
                Monthes = monthes.Select(val => new { Month = val.Month, Year = val.Year }),
                Rows = rows
            };

            return Json(data);
        }

        [HttpPost]
        public ActionResult ExpensesDetailsJson(int ID, int Year, int Month)
        {
            DateTime dateFrom = new DateTime(Year, Month, 1), dateTo = dateFrom.AddMonths(1);
            if (ID > 0)
            {
                List<Expense> expenses = db.Expenses.Where(val => val.TypeID == ID && val.Date >= dateFrom && val.Date < dateTo).OrderBy(val => val.Type.OrderNumber).ToList();
                return Json(new
                {
                    Success = true,
                    Rows = expenses.Select(val => new
                    {
                        val.ID,
                        val.ProjectID,
                        val.EmployeeID,
                        Contractor = "",
                        Date = val.Date.ToShortDateString(),
                        Sum = val.Sum,
                        Employee = val.Employee != null ? val.Employee.FullName : "",
                        ProjectName = val.Project != null ? val.Project.Name : ""
                    }).ToList()
                });
            }
            else
            {
                List<Payment> payments = db.Payments.Where(val => val.Date >= dateFrom && val.Date < dateTo
                    && val.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor).ToList();
                return Json(new
                {
                    Success = true,
                    Rows = payments.Select(val => new
                    {
                        val.ID,
                        val.ProjectID,
                        Employee = "",
                        EmployeeID = "",
                        Date = val.Date.ToShortDateString(),
                        Sum = val.Sum,
                        Contractor = val.Contractor != null ? val.Contractor.Name : "",
                        ProjectName = val.Project != null ? val.Project.Name : ""
                    }).ToList()
                });
            }
        }

        public ActionResult PaymentsDialog()
        {
            return View();
        }

        [HttpPost]
        public ActionResult PaymentsJson(int ID, int ProjectID)
        {
            Contractor contractor = db.Contractors.First(val => val.ID == ID);
            //var query = db.ProjectWorks.Where(val => !val.Project.Deleted && val.ContractorID == ID && (val.Payments.Any() ? val.Payments.Sum(val2 => val2.Sum) : 0) < (val.ContractorVat ? val.Cost * 118 / 100 : val.Cost));

            //decimal left = query.Any() ? query.Sum(val => (val.ContractorVat ? val.Cost * 118 / 100 : val.Cost) - (val.Payments.Any() ? val.Payments.Sum(val2 => val2.Sum) : 0)) : 0;

            //List<Payment> payments = query.SelectMany(val => val.Payments).OrderBy(val => val.ProjectID).ThenBy(val => val.Date).ToList();

            List<ProjectWork> works = db.ProjectWorks.Where(val => val.ProjectID == ProjectID && val.ContractorExists && val.ContractorID == ID).ToList();
            decimal total = works.Sum(w => w.CostContractor);// Math.Floor(w.Cost * 118 / 100 * (100 - w.Factor)) / 100);
            List<Payment> payments = db.Payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor && val.ProjectID == ProjectID && val.ContractorID == ID).ToList();
            decimal paid = payments.Any() ? payments.Sum(val => val.Sum) : 0;

            return Json(new
            {
                Contractor = contractor.ToJson(),
                Payments = payments.Select(val => new { Date = val.Date, Sum = val.Sum, Project = val.Project.Name }),
                Debt = total - paid,
                Payed = paid
            });
        }

        public ActionResult Stages()
        {
            string settingsName = "/AllReports/Stages";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                //WorkStages = db.WorkStages.Where(val => !val.Deleted && val.CompanyID == user.CompanyID)
                //.OrderBy(val => val.Category.OrderNumber).ThenBy(val => val.Category.Name).ThenBy(val => val.OrderNumber).ThenBy(val => val.ShortName == null || val.ShortName.Trim() == "" ? val.Name : val.ShortName).ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.Stages";
            return View();
        }

        [HttpPost]
        public ActionResult StagesJson(string DateFrom, string DateTo, bool Archived)
        {
            string settingsName = "/AllReports/Stages";
            int userID = user.ID;
            object data = null;
            List<object> rows = new List<object>();
            DateTime date1, date2, tempDate;
            #region Dates and Settings
            List<DateTime> monthes = new List<DateTime>();
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }

            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            int count = (date2.Year - date1.Year) * 12 + date2.Month - date1.Month;
            tempDate = date1;
            while (monthes.Count <= count)
            {
                monthes.Add(new DateTime(tempDate.Year, tempDate.Month, 1));
                tempDate = tempDate.AddMonths(1);
            }
            #endregion

            var query = from p in db.Projects
                        where !p.Deleted && (!p.Archived || Archived) &&
                        ((SqlFunctions.DateDiff("DAY", (p.DateSign < p.CreateDate ? p.DateSign : p.CreateDate), date1) >= 0 //Если объект создан или договор подписан до начала период
                     && (!p.ArchiveDate.HasValue || SqlFunctions.DateDiff("DAY", date1, p.ArchiveDate) >= 1)) //И активный на данный момент или  был отправлен в архив после начала периода 

                     || (SqlFunctions.DateDiff("DAY", date1, p.CreateDate) >= 0 && SqlFunctions.DateDiff("DAY", p.CreateDate, date2) >= 0) //Если объект был создан после начала периода и до конца периода
                     || (p.DateSign.HasValue && SqlFunctions.DateDiff("DAY", date1, p.DateSign) >= 0 && SqlFunctions.DateDiff("DAY", p.DateSign, date2) >= 0)) //Если договор по объекту был подписан после начала периода и до конца периода)
                        orderby p.Name
                        select p;

            foreach (Project p in query)
            {
                var item = new { ID = p.ID, Name = p.Name, Archived = p.Archived, Stages = p.ProjectStages.Select(val => val.StageID) };
                rows.Add(item);
            }

            data = new
            {
                Rows = rows
            };

            return Json(data);
        }

        public ActionResult Tasks()
        {
            string settingsName = "/AllReports/Tasks";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();
            List<TaskType> taskTypes = db.TaskTypes.Where(val => !val.Deleted && val.Report).OrderBy(val => val.ShortName == null || val.ShortName.Trim() == "" ? val.Name : val.ShortName).ToList();
            object data = new
            {
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                ReportID = ReportsEnum.TasksReport,
                TaskTypes = taskTypes.Select(val => val.ToJson()).ToList(),
                ReportFilters = GetFilters(ReportsEnum.TasksReport).Select(val => val.ToJson()).ToList(),
                ProjectStatuses = db.ProjectStatuses.ToList().Select(val => val.ToJson()).ToList(),
                TaskStatuses = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.TaskStatuses).ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.TaskTypes = taskTypes;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.Tasks";
            return View();
        }

        [HttpPost]
        public ActionResult TasksJson(string DateFrom, string DateTo, bool Archived)
        {
            string settingsName = "/AllReports/Tasks";
            int userID = user.ID;
            object data = null;
            List<object> rows = new List<object>();
            DateTime date1, date2, tempDate;
            #region Dates and Settings
            List<DateTime> monthes = new List<DateTime>();
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }

            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            int count = (date2.Year - date1.Year) * 12 + date2.Month - date1.Month;
            tempDate = date1;
            while (monthes.Count <= count)
            {
                monthes.Add(new DateTime(tempDate.Year, tempDate.Month, 1));
                tempDate = tempDate.AddMonths(1);
            }
            #endregion

            var projects = (from p in db.Projects
                        where !p.Deleted && (!p.Archived || Archived) && !p.ParentID.HasValue &&
                        ((SqlFunctions.DateDiff("DAY", (p.DateSign < p.CreateDate ? p.DateSign : p.CreateDate), date1) >= 0 //Если объект создан или договор подписан до начала период
                     && (!p.ArchiveDate.HasValue || SqlFunctions.DateDiff("DAY", date1, p.ArchiveDate) >= 1)) //И активный на данный момент или  был отправлен в архив после начала периода 

                     || (SqlFunctions.DateDiff("DAY", date1, p.CreateDate) >= 0 && SqlFunctions.DateDiff("DAY", p.CreateDate, date2) >= 0) //Если объект был создан после начала периода и до конца периода
                     || (p.DateSign.HasValue && SqlFunctions.DateDiff("DAY", date1, p.DateSign) >= 0 && SqlFunctions.DateDiff("DAY", p.DateSign, date2) >= 0)) //Если договор по объекту был подписан после начала периода и до конца периода)
                        orderby p.Name
                        select p).ToList();

            int[] projectIDs = projects.Select(val => val.ID).ToArray();
            var query = db.ProjectTasks.Include("Project").Where(val => !val.Project.Deleted && (projectIDs.Contains(val.ProjectID) || val.Project.ParentID.HasValue && projectIDs.Contains(val.Project.ParentID.Value)));
            var test = ((System.Data.Objects.ObjectQuery)query).ToTraceString();
            List<ProjectTask> tasks = query.ToList();

            foreach (Project p in projects)
            {
                var item = new
                {
                    ID = p.ID,
                    Name = p.Name,
                    Archived = p.Archived,
                    Tasks = tasks.Where(val => val.ProjectID == p.ID || val.Project.ParentID == p.ID).Select(val => val.ToJson()).ToList(),
                    Project = p.ToJson("TasksReport")
                };
                rows.Add(item);
            }

            data = new
            {
                Rows = rows
            };

            return Json(data);
        }

        public ActionResult Salary()
        {
            string settingsName = "/AllReports/Salary";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                ReportID = ReportsEnum.SalaryReport,
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                ReportFilters = GetFilters(ReportsEnum.SalaryReport).Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.Salary";
            return View();
        }

        [HttpPost]
        public ActionResult SalaryJson(string DateFrom, string DateTo, int? EmployeeID)
        {
            string settingsName = "/AllReports/Salary";
            int userID = user.ID;
            //object data = null;
            //decimal totalIncome, totalOutgoing, totalExpenses, totalManagerFee = 0;
            DateTime date1, date2;
            //List<Project> projects;
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }

            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            bool emp = EmployeeID.HasValue;
            List<Expense> expenses = db.Expenses.Where(val => val.Type.ForSalary && val.Date >= date1 && val.Date <= date2 && val.SalaryEmployeeID.HasValue && (!emp || val.SalaryEmployeeID == EmployeeID)).OrderBy(val => val.Date).ToList();
            List<Payroll> payrolls = db.Payrolls.Where(val => val.Date >= date1 && val.Date <= date2 && (!emp || val.EmployeeID == EmployeeID)).OrderBy(val => val.Date).ToList();
            List<Models.Reports.SalaryRow> rows = new List<Models.Reports.SalaryRow>(expenses.Select(val => new Models.Reports.SalaryRow(val)));
            rows.AddRange(payrolls.Select(val => new Models.Reports.SalaryRow(val)));

            return Json(new { Success = true, Rows = rows.OrderBy(val => val.Date).ThenBy(val => val.ID).ToList() });
        }

        public ActionResult Invoices()
        {
            string settingsName = "/AllReports/Invoices";
            int userID = user.ID;

            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateTime.Now.AddMonths(-1).ToShortDateString() };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTime.Now.ToShortDateString() };
                db.UserSettings.AddObject(dateToSetting);
            }
            db.SaveChanges();

            object data = new
            {
                ReportID = ReportsEnum.InvoicesReport,
                DateFrom = dateFromSetting.Value,
                DateTo = dateToSetting.Value,
                ProjectStatuses = db.ProjectStatuses.ToList().Select(val => val.ToJson()).ToList(),
                ReportFilters = GetFilters(ReportsEnum.InvoicesReport).Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "AllReports.Invoices";
            return View();
        }

        [HttpPost]
        public ActionResult InvoicesJson(string DateFrom, string DateTo)
        {
            string settingsName = "/AllReports/Invoices";
            int userID = user.ID;
            object data = null;

            DateTime date1, date2;
            List<Project> projects;
            List<Invoice> invoices;
            UserSetting dateFromSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateFrom");
            UserSetting dateToSetting = db.UserSettings.FirstOrDefault(val => val.UserID == userID && val.Name == settingsName + "/DateTo");

            if (!DateTime.TryParse(DateFrom, out date1))
            {
                date1 = DateTime.Now.AddMonths(-1).Date;
                DateFrom = date1.ToShortDateString();
            }
            if (!DateTime.TryParse(DateTo, out date2))
            {
                date2 = DateTime.Now.Date;
                DateTo = date2.ToShortDateString();
            }

            if (dateFromSetting == null)
            {
                dateFromSetting = new UserSetting() { Name = settingsName + "/DateFrom", UserID = userID, Value = DateFrom };
                db.UserSettings.AddObject(dateFromSetting);
            }
            if (dateToSetting == null)
            {
                dateToSetting = new UserSetting() { Name = settingsName + "/DateTo", UserID = userID, Value = DateTo };
                db.UserSettings.AddObject(dateToSetting);
            }

            dateFromSetting.Value = DateFrom;
            dateToSetting.Value = DateTo;
            db.SaveChanges();

            invoices = db.Invoices.Include("Project").Where(val => !val.Project.Deleted && (val.Date >= date1 && val.Date <= date2 || val.DrawnDate >= date1 && val.DrawnDate <= date2)).ToList();
            projects = invoices.Select(val => val.Project).Distinct().ToList();

            var rows = projects.Select(val =>
            {
                //decimal invoicesSum = GetTotalInvoicesSum(date1, date2, val.ID);
                //decimal payrollsSum = GetTotalPayrollsSum(date1, date2, val.ID);
                //decimal expensesSum = GetTotalExpensesSum(date1, date2, val.ID);
                //decimal gain = incomeSum - outgoingSum - expensesSum;
                //decimal managerFee = gain.RemoveVat() / 100 * val.ManagerFee;
                var pinvoices = invoices.Where(inv => inv.ProjectID == val.ID).ToList();
                return new
                {
                    val.ID,
                    val.Name,
                    Project = val.ToJson("InvoicesReport"),
                    PaidAmount = pinvoices.Sum(inv => inv.PaidAmount),
                    LeftAmount = pinvoices.Sum(inv => inv.LeftAmount),
                    Invoices = pinvoices.Select(inv => inv.ToJson()).ToArray()
                };
            }).ToList();

            data = new
            {
                PaidAmount = invoices.Sum(inv => inv.PaidAmount),
                LeftAmount = invoices.Sum(inv => inv.LeftAmount),
                Rows = rows
            };

            return Json(data);
        }

        private IEnumerable<Contract> GetMissingDocuments(Project project)
        {
            List<Contract> result = new List<Contract>();

            foreach (Contract contract in project.Contracts)
            {
                DateTime? dateEnd = contract.RoleID == (int)BuildingEntities.ContractRolesEnum.WithCustomer ? contract.Project.DateEnd : contract.ProjectWorks.Min(val => val.DateEnd);
                if (!contract.OriginalExists || (dateEnd < DateTime.Now && !contract.OriginalActsExist))
                {
                    result.Add(contract);
                }
            }

            return result.Distinct();
        }

        //private decimal GetProjectExpenses(Project project)
        //{
        //    decimal projectExpenses = project.Expenses.Sum(val => val.Sum);
        //    return projectExpenses;
        //}

        //private decimal GetProjectRatio(int year, int month, int project)
        //{
        //    decimal earnedProject = 0;
        //    decimal earnedTotal = 0;
        //    foreach (Employee e in db.Employees.Where(val => val.WorkLogs.Any(val2 => SqlFunctions.DatePart("YEAR", val2.Date) == year && SqlFunctions.DatePart("MONTH", val2.Date) == month)))
        //    {
        //        earnedProject += e.GetEarnedMoney(year, month, project);
        //        earnedTotal += e.GetEarnedMoney(year, month);
        //    }
        //    return earnedTotal == 0 ? 0 : earnedProject / earnedTotal;
        //}

        private decimal GetProjectIncomeSum(Project project)
        {
            var query = project.Payments.Where(val => val.RoleID == (int)AdCrm.Models.BuildingEntities.PaymentRolesEnum.FromCustomer);
            decimal sum = query.Any() ? query.Sum(val => val.Sum) : 0;
            return Math.Round(sum, 2);
        }

        private decimal GetProjectOutgoingSum(Project project)
        {
            var query = project.Payments.Where(val => val.RoleID == (int)AdCrm.Models.BuildingEntities.PaymentRolesEnum.ToSubcontractor);
            decimal sum = query.Any() ? query.Sum(val => val.Sum) : 0;
            return Math.Round(sum, 2);
        }

        private decimal GetTotalIncomeSum(DateTime dateFrom, DateTime dateTo)
        {
            dateFrom = dateFrom.Date;
            dateTo = dateTo.Date.AddDays(1).AddSeconds(-1);
            var query = db.Payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.FromCustomer && val.Date >= dateFrom && val.Date <= dateTo);
            decimal result = query.Any() ? query.Sum(val => val.Sum) : 0;
            return Math.Round(result, 2);
        }

        private decimal GetTotalOutgoingSum(DateTime dateFrom, DateTime dateTo)
        {
            dateFrom = dateFrom.Date;
            dateTo = dateTo.Date.AddDays(1).AddSeconds(-1);
            var query = db.Payments.Where(val => val.RoleID == (int)BuildingEntities.PaymentRolesEnum.ToSubcontractor && val.Date >= dateFrom && val.Date <= dateTo);
            decimal result = query.Any() ? query.Sum(val => val.Sum) : 0;
            return Math.Round(result, 2);
        }

        private decimal GetTotalExpensesSum(DateTime dateFrom, DateTime dateTo, int? projectID)
        {
            decimal result = 0;
            dateFrom = dateFrom.Date;
            dateTo = dateTo.Date;
            var query = db.Expenses.Where(val => (!projectID.HasValue || val.ProjectID == projectID) && SqlFunctions.DateDiff("DAY", dateFrom, val.Date) >= 0 && SqlFunctions.DateDiff("DAY", val.Date, dateTo) >= 0 && !val.Project.Deleted);
            result = query.Any() ? query.Sum(val => val.Sum) : 0;

            return Math.Round(result, 2);
        }
        private decimal GetTotalInvoicesSum(DateTime dateFrom, DateTime dateTo, int? projectID)
        {
            decimal result = 0;
            dateFrom = dateFrom.Date;
            dateTo = dateTo.Date;
            var query = db.Invoices.Where(val => (!projectID.HasValue || val.ProjectID == projectID) && SqlFunctions.DateDiff("DAY", dateFrom, val.Date) >= 0 && SqlFunctions.DateDiff("DAY", val.Date, dateTo) >= 0 && !val.Project.Deleted);
            result = query.Any() ? query.Sum(val => val.Amount) : 0;

            return Math.Round(result, 2);
        }
        private decimal GetTotalPayrollsSum(DateTime dateFrom, DateTime dateTo, int? projectID)
        {
            decimal result = 0;
            dateFrom = dateFrom.Date;
            dateTo = dateTo.Date;
            var query = db.Payrolls.Where(val => (!projectID.HasValue || val.ProjectID == projectID) && SqlFunctions.DateDiff("DAY", dateFrom, val.Date) >= 0 && SqlFunctions.DateDiff("DAY", val.Date, dateTo) >= 0 && !val.Project.Deleted);
            result = query.Any() ? query.Sum(val => val.Amount) : 0;

            return Math.Round(result, 2);
        }

        private List<ReportFilter> GetFilters(int ReportID)
        {
            int userID = user.ID;
            return db.ReportFilters.Where(val => val.UserID == userID && val.ReportID == ReportID).ToList();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }
    }
}
