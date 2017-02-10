using System.Web.Mvc;

namespace AdCrm.Areas.Client
{
    public class ClientAreaRegistration : AreaRegistration
    {
        public override string AreaName
        {
            get
            {
                return "Client";
            }
        }

        public override void RegisterArea(AreaRegistrationContext context)
        {
            context.MapRoute(
                "Client_bugs",
                "Client/Bugs",
                new { action = "Index", Controller = "Tasks", Type = "Bug" }
            );
            context.MapRoute(
                "Client_bug_details",
                "Client/Bugs/Details/{id}",
                new { action = "Details", Controller = "Tasks", Type = "Bug", id = UrlParameter.Optional }
            );
            context.MapRoute(
                "Client_default",
                "Client/{controller}/{action}/{id}",
                new { action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
