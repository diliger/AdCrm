using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using AdCrm.Helpers;
using AdCrm.Models;

namespace AdCrm.Controllers
{
    [CompressFilter]
    public class IncidentsController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();

        public ActionResult Index()
        {
            User user = HttpContext.CurrentUser();

            int userID = user.ID;
            user = db.Users.FirstOrDefault(val => val.ID == userID);
            string settingsName = "/Incidents/Index";

            BuildingEntities.RepeatIncidentsAsync();

            var data = new
            {
                IncidentTypes = db.IncidentTypes.Where(val => (!val.Deleted || val.Incidents.Any())).OrderBy(val => val.OrderNumber).ThenBy(val => val.Name).ToList().Select(val => val.ToJson()).ToList(),
                RepeatIntervals = db.RepeatIntervals.Where(val => (!val.Deleted || val.Incidents.Any())).OrderBy(val => val.OrderNumber).ThenBy(val => val.Name).ToList().Select(val => val.ToJson()).ToList(),
                Users = db.Users.ToList().Select(val => val.ToJson()).ToList(),
                Roles = db.Roles.ToList().Select(val => val.ToJson()).ToList(),
                User = user.ToJson(),
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList(),
            };

            ViewBag.Data = serializer.Serialize(data);

            return View();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }
    }
}
