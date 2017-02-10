using AdCrm.Controllers;
using AdCrm.Models;
using EntityJs.Client.Dynamic;
using System.Linq;
using System.Web.Mvc;

namespace AdCrm.Areas.Client.Controllers
{
    [Authorize(Roles = "client")]
    public class HomeController : BaseController
    {
        public ActionResult Index()
        {
            User user = HttpContext.CurrentUser();
            int contractorID = user.ContractorID.GetValueOrDefault();
            int userID = user.ID;
            string settingsName = "/Client/Home";
            int[] statbooksIDs = new[] { StatbookTypesEnum.TaskStatuses, StatbookTypesEnum.TaskPriorities, StatbookTypesEnum.TaskTurns };

            var projects = db.Projects.Where(val => val.ContractorID == contractorID && val.Deleted == false).ToList();
            var statbooks = db.Statbooks.Where(val => statbooksIDs.Contains(val.TypeID)).OrderBy(val => val.OrderNumber).ToList();

            object data = new
            {
                Projects = projects.Select(val => val.ToJson()).ToList(),
                ProjectTasks = db.ProjectTasks.Where(val => val.Project.Deleted == false && val.Project.ContractorID == contractorID).ToList().Select(val => val.ToJson()).ToList(),
                Invoices = db.Invoices.ToList().Select(val => val.ToJson()).ToList(),
                Payments = db.Payments.ToList().Select(val => val.ToJson()).ToList(),
                TaskTypes = db.TaskTypes.ToList().Select(val => val.ToJson()).ToList(),
                Statbooks = statbooks.Select(val => val.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.StartsWith(settingsName)).ToList().Select(val => val.ToJson()).ToList(),
            };

            ViewBag.Page = "/Client/Home";
            ViewBag.Data = serializer.Serialize(data);

            return View();
        }
    }
}
