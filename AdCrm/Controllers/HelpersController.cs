using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using AdCrm.Models;
using System.Web.Script.Serialization;
using AdCrm.Helpers;

namespace AdCrm.Controllers
{
    [CompressFilter]
    [Authorize(Roles = "admin,boss,watcher")]
    public class HelpersController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();
        //
        // GET: /Helpers/

        //public ActionResult WorkStages()
        //{
        //    string settingsName = "/Helpers/WorkStages";
        //    User user = HttpContext.CurrentUser();
        //    int userID = user.ID;

        //    object data = new
        //    {
        //        Refbooks = db.Refbooks.Where(val => val.TypeID == (int)RefbookTypesEnum.StageCategories && (!val.Deleted || val.WorkStages.Any(w => !w.Deleted))).ToList().Select(val => val.ToJson()).ToList(),
        //        Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
        //        WorkStages = db.WorkStages.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
        //    };

        //    ViewBag.Data = serializer.Serialize(data);
        //    ViewBag.Page = "Helpers.WorkStages";
        //    return View();
        //}

        public ActionResult Sources()
        {
            string settingsName = "/Helpers/Sources";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.Sources";
            return View();
        }

        public ActionResult WorkTypes(string ID)
        {
            string settingsName = "/Helpers/WorkTypes";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            if (ID == "UpdateSysName")
            {
                db.WorkTypes.ToList().ForEach(val => val.OnUpdated(new EntityJs.Client.Events.EntityEventArgs(db, "WorkTypes", "WorkType", val, EntityJs.Client.Events.ActionsEnum.Edit)));
                db.SaveChanges();
            }
            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                WorkTypes = db.WorkTypes.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.WorkTypes";
            return View();
        }

        //public ActionResult DemountTypes(string ID)
        //{
        //    string settingsName = "/Helpers/DemountTypes";
        //    User user = HttpContext.CurrentUser();
        //    int userID = user.ID;

        //    if (ID == "UpdateSysName")
        //    {
        //        db.DemountTypes.ToList().ForEach(val => val.OnUpdated(new EntityJs.Client.Events.EntityEventArgs(db, "DemountTypes", "DemountType", val, EntityJs.Client.Events.ActionsEnum.Edit)));
        //        db.SaveChanges();
        //    }
        //    object data = new
        //    {
        //        UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
        //        //DemountTypes = db.DemountTypes.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
        //    };

        //    ViewBag.Data = serializer.Serialize(data);
        //    ViewBag.Page = "Helpers.DemountTypes";
        //    ViewBag.MainJs = false;
        //    return View();
        //}

        public ActionResult TaskTypes(string ID)
        {
            string settingsName = "/Helpers/TaskTypes";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            if (ID == "UpdateSysName")
            {
                db.TaskTypes.ToList().ForEach(val => val.OnUpdated(new EntityJs.Client.Events.EntityEventArgs(db, "TaskTypes", "TaskType", val, EntityJs.Client.Events.ActionsEnum.Edit)));
                db.SaveChanges();
            }
            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                TaskTypes = db.TaskTypes.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.TaskTypes";
            return View();
        }

        public ActionResult ExpenseTypes()
        {
            string settingsName = "/Helpers/ExpenseTypes";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                ExpensePeriods = db.ExpensePeriods.Where(val => !val.Deleted || val.ExpenseTypes.Any(val2 => !val2.Deleted)).ToList().Select(val => val.ToJson()).ToList(),
                ExpenseTypes = db.ExpenseTypes.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList(),
                Wallets = db.Wallets.Where(val => val.TypeID != WalletTypesEnum.EmployeeWallet).ToList().Select(val => val.ToJson()).ToList(),
                ExpenseCategories = db.ExpenseCategories.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.ExpenseTypes";
            return View();
        }

        public ActionResult ExpensePeriods()
        {
            string settingsName = "/Helpers/ExpensePeriods";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                ExpensePeriods = db.ExpensePeriods.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.ExpensePeriods";
            return View();
        }

        public ActionResult Wallets()
        {
            string settingsName = "/Helpers/Wallets";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            int[] statbookIDs = new[] { StatbookTypesEnum.WalletTypes };

            object data = new
            {
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                Statbooks = db.Statbooks.Where(val => statbookIDs.Contains(val.TypeID)).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.Wallets";
            return View();
        }

        public ActionResult IncidentTypes()
        {
            string settingsName = "/Helpers/IncidentTypes";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                IncidentTypes = db.IncidentTypes.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.IncidentTypes";
            return View();
        }

        public ActionResult RepeatIntervals()
        {
            string settingsName = "/Helpers/RepeatIntervals";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList(),
                RepeatIntervals = db.RepeatIntervals.Where(val => !val.Deleted).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.RepeatIntervals";
            return View();
        }

        public ActionResult Refbooks(int ID)
        {
            User user = db.CurrentUser;
            int userID = db.CurrentUser.ID;
            string settings = "/Helpers/Refbooks/" + ID;
            RefbookType rt = db.RefbookTypes.FirstOrDefault(val => val.ID == ID);
            var data = new
            {
                RefbookType = rt.ToJson(),
                Refbooks = db.Refbooks.Where(val => val.TypeID == ID && !val.Deleted).ToList().Select(val => val.ToJson()).ToList(),
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settings)).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.RefbookType = rt;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.Refbooks." + ID;

            return View();
        }

        public ActionResult FileCategories()
        {
            string settingsName = "/Helpers/FileCategories";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.FileCategories";
            return View();
        }

        public ActionResult Settings()
        {
            string settingsName = "/Helpers/Settings";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.Settings";
            return View();
        }

        public ActionResult EmailTemplates()
        {
            string settingsName = "/Helpers/EmailTemplates";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            object data = new
            {
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Helpers.EmailTemplates";
            ViewBag.MainJs = false;
            return View();
        }

        protected override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            base.OnActionExecuting(filterContext);
            ViewBag.SystemSettings = true;
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }

    }
}
