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
    public class ExpensesController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();

        [Authorize(Roles = "admin,boss,watcher")]
        public ActionResult Index()
        {
            string settingsName = "/Expenses/Index";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            int year = DateTime.Today.Year;
            int month = DateTime.Today.Month;
            List<int> years;
            string[] months = System.Globalization.CultureInfo.CurrentCulture.DateTimeFormat.MonthNames;
            years = db.Expenses.Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList();

            for (int i = years.Any() ? years.First() : DateTime.Today.Year; i < DateTime.Today.Year + 2; i++)
            {
                if (!years.Contains(i))
                {
                    years.Add(i);
                }
            }
            years = years.OrderByDescending(val => val).ToList();

            Func<int, int?, IQueryable<Expense>> query = (y, m) => db.Expenses.Where(val => SqlFunctions.DatePart("YEAR", val.Date) == y && (!m.HasValue || SqlFunctions.DatePart("MONTH", val.Date) == m));

            object data = new
            {
                Year = year,
                Month = month,
                Years = years.Select(val => new
                {
                    Year = val,
                    //Total = (query(val, null).Any() ? query(val, null).Sum(val2 => val2.Sum) : 0).ToString("#,##0.00"),
                    Months = Enumerable.Range(1, 12).Select(val2 => new
                    {
                        Year = val,
                        Name = months[val2 - 1],
                        Month = val2,
                        Total = (query(val, val2).Any() ? query(val, val2).Sum(val3 => val3.Sum) : 0)//.ToString("#,##0.00")
                    })
                }),
                Months = months,
                Page = settingsName,
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                ExpenseTypes = db.ExpenseTypes.Where(val => !val.Deleted || val.Expenses.Any()).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                ExpenseCategories = db.ExpenseCategories.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Expenses.Index";
            return View();
        }

        [Authorize(Roles = "admin,boss,manager,watcher")]
        public ActionResult TotalJson(EntityJs.Client.Objects.JsSelectOptions Options)
        {
            User user = HttpContext.CurrentUser();
            Func<int, int?, IQueryable<Expense>> query = (y, m) => db.Expenses.Where(val => SqlFunctions.DatePart("YEAR", val.Date) == y && (!m.HasValue || SqlFunctions.DatePart("MONTH", val.Date) == m));
            //years = db.Expenses.Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList();
            string[] months = System.Globalization.CultureInfo.CurrentCulture.DateTimeFormat.MonthNames;
            List<int> years = db.Expenses.Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList();

            for (int i = years.Any() ? years.First() : DateTime.Today.Year; i < DateTime.Today.Year + 2; i++)
            {
                if (!years.Contains(i))
                {
                    years.Add(i);
                }
            }
            years = years.OrderByDescending(val => val).ToList();

            decimal total = 0;
            if (Options != null)
            {
                EntityJs.Client.Objects.WhereCollection where = null;
                EntityJs.Client.Objects.OrderCollection order = null;
                if (Options.Wheres != null && Options.Wheres.Length > 0)
                {
                    where = new EntityJs.Client.Objects.WhereCollection(Options.Wheres);
                }

                if (Options.Orders != null && Options.Orders.Length > 0)
                {
                    order = new EntityJs.Client.Objects.OrderCollection(Options.Orders);
                }

                var model = new EntityJs.Client.EntityModel<System.Data.Objects.ObjectContext>(db);
                IQueryable expenses = model.SelectQuery("Expenses", "Expense", where, order);
                total = EntityJs.Client.Dynamic.DynamicQueryable.Sum(expenses, "it.PeriodSum");
            }

            object data = new
            {
                Total = total,
                Years = years.Select(val => new
                {
                    Year = val,
                    Months = Enumerable.Range(1, 12).Select(val2 => new
                    {
                        Year = val,
                        Name = months[val2 - 1],
                        Month = val2,
                        Total = (query(val, val2).Any() ? query(val, val2).Sum(val3 => val3.Sum) : 0)
                    })
                }),
            };
            return Json(data);
        }

        public ActionResult ListPartial(string ID, int? ViewType, int? EmployeeID)
        {
            string settingsName = ID ?? "/Expenses/ListPartial";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                ExpensePrices = EmployeeID.HasValue ? db.ExpensePrices.Where(val => val.EmployeeID == EmployeeID).ToList().Select(val => val.ToJson()).ToList() : null,
                ExpenseTypes = db.ExpenseTypes.Where(val => !val.Deleted || val.Expenses.Any()).OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                ExpenseCategories = db.ExpenseCategories.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.ForProject = ViewType == 0 || ViewType == 1;
            ViewBag.ForEmployee = ViewType == 0 || ViewType == 2;
            ViewBag.Employee = EmployeeID.HasValue;
            return View();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }
    }
}
