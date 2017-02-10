using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using System.Linq.Expressions;
using System.Web.Mvc.Html;
using System.Reflection;
using AdCrm.Models;
using AdCrm.Properties;
using System.Configuration;
using System.Web.Configuration;

public static class Extensions
{
    public static User CurrentUser(this HttpContextBase Context)
    {
        User user = null;
        BuildingEntities db;
        if (Context.Request.IsAuthenticated)
        {
            user = Context.Session[FormsAuthentication.FormsCookieName] as User;
            if (user == null || !user.RoleReference.IsLoaded)
            {
                using (db = new BuildingEntities())
                {
                    user = db.Users.FirstOrDefault(val => val.Login == Context.User.Identity.Name);
                    if (user != null)
                    {
                        user.RoleReference.Load();
                        Context.Session[FormsAuthentication.FormsCookieName] = user;
                    }
                    else
                    {
                        FormsAuthentication.SignOut();
                        Context.Response.Redirect("~/");
                    }
                }
            }
        }
        return user;
    }

    //public static Company CurrentCompany(this HttpContextBase Context)
    //{
    //    if (Context == null)
    //        return null;

    //    Company company = null;
    //    User user = Context.CurrentUser();
    //    BuildingEntities db;
    //    if (Context.Request.IsAuthenticated)
    //    {
    //        company = Context.Session[FormsAuthentication.FormsCookieName + "_Company"] as Company;
    //        if (company == null)
    //        {
    //            using (db = new BuildingEntities())
    //            {
    //                company = db.Companies.FirstOrDefault(val => val.ID == user.CompanyID);
    //                if (user != null)
    //                {
    //                    Context.Session[FormsAuthentication.FormsCookieName + "_Company"] = company;
    //                }
    //                else
    //                {
    //                    FormsAuthentication.SignOut();
    //                    Context.Response.Redirect("~/");
    //                }
    //            }
    //        }
    //    }
    //    return company;
    //}

    //public static Company CurrentCompany(this HttpContextBase Context, Company Company)
    //{
    //    if (Company == null || Context.CurrentCompany() == null || Context.CurrentCompany().ID == Company.ID)
    //    {
    //        Context.Session[FormsAuthentication.FormsCookieName + "_Company"] = Company;
    //    }

    //    return Company;
    //}

    public static User CurrentUser(this HttpContextBase Context, User User)
    {
        if (User == null || Context.CurrentUser() == null || Context.CurrentUser().ID == User.ID)
        {
            Context.Session[FormsAuthentication.FormsCookieName] = User;
        }

        return User;
    }

    public static string ContentVersion(this UrlHelper Helper, string Path)
    {
        return Helper.Content(Path + "?v=" + AdCrm.MvcApplication.Version);
    }

    public static JsonResult GetJsonResult(this Controller Controller, int Code, object Data, string Message)
    {
        JsonResult result = new JsonResult();
        result.Data = new { code = Code, result = Data, message = Message };
        return result;
    }
    public static JsonResult GetJsonResult(this Controller Controller, int Code, object Data)
    {
        JsonResult result = new JsonResult();
        result.Data = new { code = Code, result = Data };
        return result;
    }
    public static JsonResult GetJsonResult(this Controller Controller, int Code, string Message)
    {
        JsonResult result = new JsonResult();
        result.Data = new { code = Code, message = Message };
        return result;
    }
    public static JsonResult GetJsonResult(this Controller Controller, int Code)
    {
        JsonResult result = new JsonResult();
        result.Data = new { code = Code };
        return result;
    }

    public static List<string> GetJsonProperties(this EntityJs.Client.Objects.IEntity Entity, string Mode = null)
    {
        object obj;
        if (Entity as EntityJs.Client.Objects.IEntityCustomSelect != null && Mode.IsNotNullOrEmpty())
        {
            obj = ((EntityJs.Client.Objects.IEntityCustomSelect)Entity).ToJson(Mode);
        }
        else
        {
            obj = Entity.ToJson();
        }
        Dictionary<string, object> dict = obj as Dictionary<string, object>;
        List<string> result = new List<string>();

        if (dict != null)
        {
            result.AddRange(dict.Keys);
        }
        else
        {
            foreach (PropertyInfo pi in obj.GetType().GetProperties())
            {
                result.Add(pi.Name);
            }
        }
        return result;
    }

    public static System.Linq.IQueryable<T> Find<T>(this System.Data.Objects.ObjectSet<T> OSet, Expression<Func<T, Boolean>> predicate)
        where T : System.Data.Objects.DataClasses.EntityObject
    {
        //Check the object context for Added objects first.
        var LocalContextObjects = OSet.Context.ObjectStateManager.GetObjectStateEntries(System.Data.EntityState.Added | System.Data.EntityState.Modified | System.Data.EntityState.Unchanged)
            .Select(val => val.Entity).OfType<T>();
        var DeletedContextObjects = OSet.Context.ObjectStateManager.GetObjectStateEntries(System.Data.EntityState.Deleted)
            .Select(val => val.Entity).OfType<T>();

        Func<T, Boolean> Cpredicate = predicate.Compile();
        List<T> MatchingObjects = new List<T>();
        List<T> DeletedObjects = new List<T>();

        foreach (T TObj in LocalContextObjects)
        {
            if (Cpredicate.Invoke(TObj))
            {
                MatchingObjects.Add(TObj);
            }
        }
        foreach (T TObj in DeletedContextObjects)
        {
            if (Cpredicate.Invoke(TObj))
            {
                DeletedObjects.Add(TObj);
            }
        }

        //Now include a query to retrieve objects from the DB.
        var DBObjects = OSet.Where(predicate);

        if (MatchingObjects.Count > 0)
        {
            //We found some added objects in the context.
            //We want to return these objects as well as any Objects in DB
            //that satisfy the predicate.
            return MatchingObjects.Union(DBObjects.ToList().Where(val => !DeletedObjects.Any(val2 => val.EntityKey.Equals(val2.EntityKey)))).AsQueryable();
        }
        else
        {
            //We didn't find any added objects in the context,
            //so we just return the DB query.
            return DBObjects;
        }
    }

}