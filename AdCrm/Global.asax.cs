using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace AdCrm
{
    // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
    // visit http://go.microsoft.com/?LinkId=9394801
    public class MvcApplication : System.Web.HttpApplication
    {
        public static string Version = "4.0.7.6";
        public static string FullRootUrl { get; private set; }
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());
        }

        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                "Thumb", // Route name
                "Thumb/{fileID}/{id}", // URL with parameters
                new { controller = "Data", action = "ImageThumbnail" } // Parameter defaults
            );
            routes.MapRoute(
                "UploadFile", // Route name
                "Data/UploadFile/{id}/{folderID}", // URL with parameters
                new { controller = "Data", action = "UploadToFolder" }, // Parameter defaults
                new { folderID = "^\\d+$" }
            );
            routes.MapRoute(
                "DownloadFile", // Route name
                "File/{fileID}/{id}", // URL with parameters
                new { controller = "Data", action = "DownloadFile" }, // Parameter defaults
                new { fileID = "^\\d+$" }
            );
            routes.MapRoute(
                "Default", // Route name
                "{controller}/{action}/{id}", // URL with parameters
                new { controller = "Manager", action = "Index", id = UrlParameter.Optional } // Parameter defaults
            );
        }

        protected void Application_Start()
        {
            //Models.BuildingEntities.RepeatIncidentsAsync();

            AreaRegistration.RegisterAllAreas();

            RegisterGlobalFilters(GlobalFilters.Filters);
            RegisterRoutes(RouteTable.Routes);
            Application["Version"] = Version;

            Code.EventWorker.Worker.RegisterWorker("TasksWorker", new AdCrm.Code.TasksWorker());
            Code.EventWorker.Worker.Start();
        }

        protected void Session_Start()
        {
            FullRootUrl = HttpContext.Current.Request.FullRootUrl();
        }

        protected void Application_BeginRequest()
        {
            if (!Code.EventWorker.Worker.IsAlive)
            {
                Code.EventWorker.Worker.RegisterWorker("TasksWorker", new AdCrm.Code.TasksWorker());
                Code.EventWorker.Worker.Start();
            }
        }
    }
}