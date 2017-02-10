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
    public class PayrollsController : BaseController
    {
        [Authorize(Roles = "admin,boss,watcher,manager")]
        public ActionResult Index()
        {
            string settingsName = "/Payrolls/Index";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            int year = DateTime.Today.Year;
            int month = DateTime.Today.Month;
            List<int> years;
            string[] months = System.Globalization.CultureInfo.CurrentCulture.DateTimeFormat.MonthNames;
            years = db.Payrolls.Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList();

            for (int i = years.Any() ? years.First() : DateTime.Today.Year; i < DateTime.Today.Year + 2; i++)
            {
                if (!years.Contains(i))
                {
                    years.Add(i);
                }
            }
            years = years.OrderByDescending(val => val).ToList();

            Func<int, int?, IQueryable<Payroll>> query = (y, m) => db.Payrolls.Where(val => SqlFunctions.DatePart("YEAR", val.Date) == y && (!m.HasValue || SqlFunctions.DatePart("MONTH", val.Date) == m));

            object data = new
            {
                Year = year,
                Month = month,
                Years = years.Select(val => new
                {
                    Year = val,
                    Months = Enumerable.Range(1, 12).Select(val2 => new
                    {
                        Year = val,
                        Name = months[val2 - 1],
                        Month = val2,
                        Total = (query(val, val2).Any() ? query(val, val2).Sum(val3 => val3.Amount) : 0)
                    })
                }),
                Months = months,
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Payrolls.Index";
            return View();
        }

        [Authorize(Roles = "admin,boss,manager,watcher")]
        public ActionResult TotalJson()
        {
            User user = HttpContext.CurrentUser();
            Func<int, int?, IQueryable<Payroll>> query = (y, m) => db.Payrolls.Where(val => SqlFunctions.DatePart("YEAR", val.Date) == y && (!m.HasValue || SqlFunctions.DatePart("MONTH", val.Date) == m));
            string[] months = System.Globalization.CultureInfo.CurrentCulture.DateTimeFormat.MonthNames;
            List<int> years = db.Payrolls.Select(val => SqlFunctions.DatePart("YEAR", val.Date)).Distinct().OrderByDescending(val => val).Select(val => val.Value).ToList();

            for (int i = years.Any() ? years.First() : DateTime.Today.Year; i < DateTime.Today.Year + 2; i++)
            {
                if (!years.Contains(i))
                {
                    years.Add(i);
                }
            }
            years = years.OrderByDescending(val => val).ToList();

            object data = new
            {
                Years = years.Select(val => new
                {
                    Year = val,
                    Months = Enumerable.Range(1, 12).Select(val2 => new
                    {
                        Year = val,
                        Name = months[val2 - 1],
                        Month = val2,
                        Total = (query(val, val2).Any() ? query(val, val2).Sum(val3 => val3.Amount) : 0)
                    })
                }),
            };
            return Json(data);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }
    }
}
