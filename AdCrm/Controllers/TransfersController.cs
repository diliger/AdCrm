using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using AdCrm.Models;

namespace AdCrm.Controllers
{
    public class TransfersController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();

        public ActionResult Index()
        {
            string settingsName = "/Transfers/Index";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            var data = new
            {
                //Wallets = db.Wallets.ToList().Select(val => val.ToJson()).ToList(),
                //WalletRatios = db.WalletRatios.ToList().Select(val => val.ToJson()).ToList(),
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "Transfers.Index";
            return View();
        }

        public ActionResult Print(int ID)
        {
            Transfer row = db.Transfers.FirstOrDefault(val => val.ID == ID);
            
            if (row == null)
                return HttpNotFound();

            var e = new EntityJs.Client.Events.CheckPermissionsEventArgs(db, "Transfers", "Transfer", row, EntityJs.Client.Events.ActionsEnum.Select);
            row.OnCheckPermissions(e);
            if (e.Cancel)
                return HttpNotFound();

            ViewBag.Transfer = row;
            ViewBag.Page = "Transfers.Print";
            ViewBag.Print = true;
            return View();
        }
    }
}
