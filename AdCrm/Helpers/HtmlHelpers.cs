using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using AdCrm.Models;

public static class HtmlHelpers
{
    public static string SystemSetting(this HtmlHelper htmlHelper, string Name)
    {
        BuildingEntities db = new BuildingEntities();
        SystemSetting setting = db.SystemSettings.FirstOrDefault(val => val.Name.ToLower() == Name.ToLower());
        db.Dispose();
        return setting != null ? setting.Value : null;
    }

    public static string UserSetting(this HtmlHelper htmlHelper, string Name)
    {
        int UserID = HttpContext.Current.Request.RequestContext.HttpContext.CurrentUser().ID;
        BuildingEntities db = new BuildingEntities();
        UserSetting setting = db.UserSettings.FirstOrDefault(val => val.Name.ToLower() == Name.ToLower() && val.UserID == UserID);
        db.Dispose();
        return setting != null ? setting.Value : null;
    }
}
