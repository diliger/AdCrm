using AdCrm.Helpers;
using AdCrm.Models;
using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace AdCrm.Controllers
{
    [CompressFilter]
    public abstract class BaseController : Controller
    {
        protected JavaScriptSerializer serializer = new JavaScriptSerializer();
        protected BuildingEntities db = new BuildingEntities();

        protected ActionResult ViewWithData(object Data)
        {
            ViewBag.Data = serializer.Serialize(Data);
            return View();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }
    }
}
