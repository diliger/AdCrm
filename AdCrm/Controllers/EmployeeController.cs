using System;
using System.Collections.Generic;
using System.Data.Objects.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using AdCrm.Helpers;
using AdCrm.Models;

namespace AdCrm.Controllers
{
    [CompressFilter]
    public class EmployeeController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();

        public ActionResult Index(int? ID)
        {
            string settingsName = "/Employee/Index";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            Employee employee = db.Employees.FirstOrDefault(val => val.ID == ID && !val.Deleted);

            if (!ID.HasValue && user.EmployeeID.HasValue || user.RoleID == (int)RolesEnum.Employee && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return Redirect("~/Employee/Index/" + user.EmployeeID);
            }

            if (user.RoleID == (int)RolesEnum.Manager && employee.User != null && employee.User.RoleID <= (int)RolesEnum.Manager && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return HttpNotFound();
            }

            int year = DateTime.Today.Year;
            int month = DateTime.Today.Month;
            List<int> years;
            string[] months = System.Globalization.CultureInfo.CurrentCulture.DateTimeFormat.MonthNames;
            years = db.Expenses.Where(val => val.EmployeeID == ID).Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList();
            years.AddRange(db.Transfers.Where(val => (val.WalletFrom.EmployeeID == ID || val.WalletTo.EmployeeID == ID))
                .Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList());

            for (int i = years.Any() ? years.First() : DateTime.Today.Year; i < DateTime.Today.Year + 2; i++)
            {
                if (!years.Contains(i))
                {
                    years.Add(i);
                }
            }
            years = years.Distinct().OrderByDescending(val => val).ToList();
            List<Wallet> wallets = db.Wallets.Where(val => val.EmployeeID == ID || val.EmployeeWallets.Any(ew => ew.EmployeeID == ID && ew.Expense)).ToList();

            employee.UpdateSalaryBalance();
            db.SaveChanges();

            object data = new
            {
                Year = year,
                Month = month,
                Years = years,
                Months = months,
                Employee = employee.ToJson(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),

                Departments = db.Departments.Where(val => !val.Deleted || val.ID == employee.DepartmentID).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                Positions = db.Positions.Where(val => !val.Deleted || val.ID == employee.PositionID).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Employee = employee;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Employee.Index";
            return View();
        }

        public ActionResult Tasks(int ID)
        {
            string settingsName = "/Employee/Tasks";

            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            Employee employee = db.Employees.FirstOrDefault(val => val.ID == ID && !val.Deleted);

            if (user.RoleID == (int)RolesEnum.Employee && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return Redirect("~/Employee/Index/" + user.EmployeeID);
            }

            if (user.RoleID == (int)RolesEnum.Manager && employee.User != null && employee.User.RoleID <= (int)RolesEnum.Manager && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return HttpNotFound();
            }

            List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee
                || val.ID == userID || val.ProjectTasks.Any(t => t.EmployeeID == ID)).ToList();

            //List<Project> projects = db.Projects.Where(val => val.ProjectTasks.Any(t => t.EmployeeID == ID || t.ResponsibleID == userID || t.Creator == user.Login)).ToList();
            object data = new
            {
                Employee = employee.ToJson(),
                Users = users.Select(val => val.ToJson()).ToList(),
                EmployeeProperties = new Employee().GetJsonProperties(),
                ProjectProperties = new Project().GetJsonProperties("Details"),
                //Projects = projects.Select(val => val.ToJson("Details")).ToList(),
                Statbooks = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.TaskStatuses).ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList(),

                Departments = db.Departments.Where(val => !val.Deleted || val.ID == employee.DepartmentID).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                Positions = db.Positions.Where(val => !val.Deleted || val.ID == employee.PositionID).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Employee = employee;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Employee.Index";
            return View();
        }

        public ActionResult Salary(int ID)
        {
            string settingsName = "Employee.Salary";

            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            Employee employee = db.Employees.FirstOrDefault(val => val.ID == ID && !val.Deleted);

            if (user.RoleID == (int)RolesEnum.Employee && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return Redirect("~/Employee/Index/" + user.EmployeeID);
            }

            if (user.RoleID == (int)RolesEnum.Manager && employee.User != null && employee.User.RoleID <= (int)RolesEnum.Manager && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return HttpNotFound();
            }

            int year = DateTime.Today.Year;
            int month = DateTime.Today.Month;
            List<int> years;
            string[] months = System.Globalization.CultureInfo.CurrentCulture.DateTimeFormat.MonthNames;
            years = db.Expenses.Where(val => val.Type.ForSalary && val.SalaryEmployeeID == ID).Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList();
            years.AddRange(db.Payrolls.Where(val => val.EmployeeID == ID).Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList());

            for (int i = years.Any() ? years.First() : DateTime.Today.Year; i < DateTime.Today.Year + 2; i++)
            {
                if (!years.Contains(i))
                {
                    years.Add(i);
                }
            }
            years = years.Distinct().OrderByDescending(val => val).ToList();

            //List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee
            //    || val.ID == userID || val.ProjectTasks.Any(t => t.EmployeeID == ID)).ToList();

            //List<Project> projects = db.Projects.Where(val => val.ProjectTasks.Any(t => t.EmployeeID == ID || t.ResponsibleID == userID || t.Creator == user.Login)).ToList();
            object data = new
            {
                Year = year,
                Month = month,
                Years = years,
                Months = months,
                Employee = employee.ToJson(),
                //Users = users.Select(val => val.ToJson()).ToList(),
                EmployeeProperties = new Employee().GetJsonProperties(),
                ProjectProperties = new Project().GetJsonProperties("Details"),
                //Projects = projects.Select(val => val.ToJson("Details")).ToList(),
                //Statbooks = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.TaskStatuses).ToList().Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList(),

                Departments = db.Departments.Where(val => !val.Deleted || val.ID == employee.DepartmentID).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                Positions = db.Positions.Where(val => !val.Deleted || val.ID == employee.PositionID).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Employee = employee;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = settingsName;
            return View();
        }

        //public ActionResult ExpensePrices(string ID)
        //{
        //    string settingsName = ID ?? "/Employee/ExpensePrices";
        //    User user = HttpContext.CurrentUser();
        //    int userID = user.ID;

        //    object data = new
        //    {
        //        Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
        //    };
        //    ViewBag.Data = serializer.Serialize(data);
        //    return View();
        //}

        public ActionResult Incomes(string ID)
        {
            string settingsName = ID ?? "/Employee/Payments";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };
            ViewBag.Data = serializer.Serialize(data);
            return View();
        }

        public ActionResult Transfers(string ID)
        {
            string settingsName = ID ?? "/Employee/Transfers";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };
            ViewBag.Data = serializer.Serialize(data);
            return View();
        }

        [HttpPost]
        public JsonResult BalanceJson(int ID)
        {
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Employee employee = db.Employees.FirstOrDefault(val => val.ID == ID);

            if (user.RoleID == (int)RolesEnum.Employee && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return Json(new { ID = ID, Balance = 0, Success = false, Error = "Not allowed." });
            }

            if (user.RoleID == (int)RolesEnum.Manager && employee.User != null && employee.User.RoleID <= (int)RolesEnum.Manager && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return Json(new { ID = ID, Balance = 0, Success = false, Error = "Not allowed." });
            }

            return Json(new { ID = ID, Balance = employee.Balance });
        }

        [HttpPost]
        public JsonResult SalaryJson(int ID, int? Month, int? Year)
        {
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Employee employee = db.Employees.FirstOrDefault(val => val.ID == ID);

            if (user.RoleID == (int)RolesEnum.Employee && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return Json(new { ID = ID, Success = false, Error = "Not allowed." });
            }

            if (user.RoleID == (int)RolesEnum.Manager && employee.User != null && employee.User.RoleID <= (int)RolesEnum.Manager && (user.EmployeeID != ID || employee.UserID != user.ID))
            {
                return Json(new { ID = ID, Success = false, Error = "Not allowed." });
            }

            List<Expense> expenses = db.Expenses.Where(val => val.Type.ForSalary && val.SalaryEmployeeID == ID 
                && (!Month.HasValue || SqlFunctions.DatePart("MONTH", val.Date) == Month)
                && (!Year.HasValue || SqlFunctions.DatePart("YEAR", val.Date) == Year)).OrderBy(val => val.Date).ToList();
            List<Payroll> payrolls = db.Payrolls.Where(val => val.EmployeeID == ID
                && (!Month.HasValue || SqlFunctions.DatePart("MONTH", val.Date) == Month)
                && (!Year.HasValue || SqlFunctions.DatePart("YEAR", val.Date) == Year)).OrderBy(val => val.Date).ToList();
            List<Models.Reports.SalaryRow> rows = new List<Models.Reports.SalaryRow>(expenses.Select(val => new Models.Reports.SalaryRow(val)));
            rows.AddRange(payrolls.Select(val => new Models.Reports.SalaryRow(val)));

            return Json(new { Success = true, Rows = rows.OrderBy(val => val.Date).ThenBy(val => val.ID).ToList() });
 
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }
    }
}
