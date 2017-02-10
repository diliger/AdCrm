using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Building.Models;

namespace Building.Controllers
{
    public class ProductsController : BaseController
    {
        public ActionResult Index()
        {
            string settingsName = "/Products/Index";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            var data = new
            {
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Page = "Products.Index";
            return ViewWithData(data);
        }

        public ActionResult Orders()
        {
            string settingsName = "/Products/Orders";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            var data = new
            {
                Statbooks = db.Statbooks.Where(val => val.TypeID == (int)StatbookTypesEnum.DispatchStatuses).ToList().Select(val => val.ToJson()).ToList(),
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Page = "Products.Orders";
            return ViewWithData(data);
        }

        public ActionResult PrintOrder(int ID)
        {
            ProjectDispatchOrder row = db.ProjectDispatchOrders.Include("ProjectProducts").FirstOrDefault(val => val.ID == ID);

            if (row == null)
                return HttpNotFound();

            var e = new EntityJs.Client.Events.CheckPermissionsEventArgs(db, "ProjectDispatchOrders", "ProjectDispatchOrder", row, EntityJs.Client.Events.ActionsEnum.Select);
            row.OnCheckPermissions(e);
            if (e.Cancel)
                return HttpNotFound();

            ViewBag.Dispatch = row;
            ViewBag.Products = row.ProjectProducts.ToList();
            ViewBag.Page = "Products.PrintOrder";
            ViewBag.Print = true;
            return View();
        }

        public ActionResult Dispatches(string ID, int? DispatchID, int? OrderID)
        {
            ID = ID.StringAndTrim().ToLower();
            if (ID.IsNotNullOrEmpty() && ID != "details" && ID != "create")
                return HttpNotFound();
            string settingsName = "/Products/Dispatches";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            ProjectDispatch dispatch = DispatchID.HasValue ? db.ProjectDispatches.FirstOrDefault(val => val.ID == DispatchID) : null;
            ProjectDispatchOrder order = OrderID.HasValue ? db.ProjectDispatchOrders.FirstOrDefault(val => val.ID == OrderID) : null;
            if (dispatch != null)
            {
                var e = new EntityJs.Client.Events.CheckPermissionsEventArgs(db, "ProjectDispatches", "ProjectDispatch", dispatch, EntityJs.Client.Events.ActionsEnum.Select);
                dispatch.OnCheckPermissions(e);
                if (e.Cancel)
                    dispatch = null;
            }

            var data = new
            {
                Action = ID,
                Dispatch = dispatch != null ? dispatch.ToJson() : null,
                Order = order != null ? order.ToJson() : null,
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.Page = "Products.Dispatches";
            return ViewWithData(data);
        }

        public ActionResult PrintDispatch(int ID)
        {
            ProjectDispatch row = db.ProjectDispatches.Include("ProductDispatches").FirstOrDefault(val => val.ID == ID);

            if (row == null)
                return HttpNotFound();

            var e = new EntityJs.Client.Events.CheckPermissionsEventArgs(db, "ProjectDispatches", "ProjectDispatch", row, EntityJs.Client.Events.ActionsEnum.Select);
            row.OnCheckPermissions(e);
            if (e.Cancel)
                return HttpNotFound();

            ViewBag.Dispatch = row;
            ViewBag.Products = row.ProductDispatches.Where(val => !val.Deleted).ToList();
            ViewBag.Page = "Products.PrintDispatch";
            ViewBag.Print = true;
            return View();
        }
    }
}
