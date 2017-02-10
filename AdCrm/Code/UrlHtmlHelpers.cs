using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Text;

namespace AdCrm
{
    public static class UrlHtmlHelpers
    {
        public static UrlHelper CreateUrlHelper()
        {
            string path = AdCrm.Settings.WebsiteRootPath;
            int index = path.LastIndexOf("/");
            string domain = path.Substring(0, index);
            string name = path.Substring(index);

            HttpRequest request = new HttpRequest(name, domain, string.Empty);
            HttpResponse response = new HttpResponse(new System.IO.StringWriter());
            HttpContext httpContext = new HttpContext(request, response);

            HttpContextBase httpContextBase = new HttpContextWrapper(httpContext);
            System.Web.Routing.RouteData routeData = new System.Web.Routing.RouteData();
            System.Web.Routing.RequestContext requestContext = new System.Web.Routing.RequestContext(httpContextBase, routeData);

            return new UrlHelper(requestContext);
        }

        public static string FullRootUrl(this UrlHelper url)
        {
            return url.RequestContext.HttpContext.Request.FullRootUrl();
        }

        public static string AbosuluteContent(this UrlHelper url, string path)
        {
            return url.FullRootUrl() + url.Content(path).Trim('/');
        }

        public static string FullRootUrl(this HttpRequest Request)
        {
            return Request.RequestContext.HttpContext.Request.FullRootUrl();
        }

        public static string FullRootUrl(this HttpRequestBase Request)
        {
            Uri url = Request.Url;
            string port = url.Port == 80 ? string.Empty : ":" + url.Port;
            string result = string.Format("{0}://{1}{2}{3}", url.Scheme, url.Host, port, Request.ApplicationPath);

            if (!result.EndsWith("/"))
            {
                result += "/";
            }

            return result;
        }

    }
}