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
    [Authorize(Roles = "admin,boss,manager,watcher")]
    public class ContractorController : Controller
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        BuildingEntities db = new BuildingEntities();

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult Details()
        {
            return View();
        }

        public ActionResult Dialog()
        {
            int[] refbookIDs = new[] { (int)RefbookTypesEnum.ContactPersonTypes, (int)RefbookTypesEnum.ContractorNoteTypes };
            int[] statbookIDs = new[] { (int)StatbookTypesEnum.Genders };

            User user = HttpContext.CurrentUser();
            List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee || val.ResponsibleContractors.Any(c => !c.Deleted)).ToList();
            object data = new
            {
                Users = users.Select(val => val.ToJson()).ToList(),
                ContactTypes = db.ContactTypes.ToList().Select(val => val.ToJson()).ToList(),
                InformationSources = db.InformationSources.ToList().Select(val => val.ToJson()).ToList(),
                Refbooks = db.Refbooks.Where(val => refbookIDs.Contains(val.TypeID)).ToList().Select(val => val.ToJson()).ToList(),
                Statbooks = db.Statbooks.Where(val => statbookIDs.Contains(val.TypeID)).ToList().Select(val => val.ToJson()).ToList(),
                Departments = db.Departments.OrderBy(val => val.OrderNumber).ToList().Select(val => val.ToJson()).ToList(),
                ContractorStatuses = db.ContractorStatuses.ToList().Select(val => val.ToJson()).ToList(),
                ContractorTypes = db.ContractorTypes.ToList().Select(val => val.ToJson()).ToList(),
                ContractorSubTypes = db.ContractorSubTypes.ToList().Select(val => val.ToJson()).ToList()
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
