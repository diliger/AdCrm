using AdCrm.Helpers;
using AdCrm.Models;
using System;
using System.Linq;
using System.Security.Principal;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using System.Web.Security;

namespace AdCrm.Controllers
{
    [CompressFilter]
    public class UserController : Controller
    {
        BuildingEntities db = new BuildingEntities();
        JavaScriptSerializer serializer = new JavaScriptSerializer();

        public ActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public ActionResult Login(string Login, string Password, bool RememberMe, string Database)
        {
            //if (Settings.Default.LocalRun)
            //{
            //    HttpContext.CurrentDatabase(Database);
            //    bool exists = false;
            //    try
            //    {
            //        exists = new FileInfo(Database).Exists;
            //    }
            //    catch
            //    { }
            //    if (!exists)
            //    {
            //        ViewBag.LoginFailed = true;
            //        ViewBag.Error = "DatabaseNotFound";
            //        return View();
            //    }
            //}
            if (AuthenticateUser(Login, Password, RememberMe))
            {
                User user = HttpContext.CurrentUser();
                HttpContext.CurrentUser(user);
                if (user.RoleID == (int)RolesEnum.Employee)
                {
                    return new RedirectResult("~/Employee/Index/" + user.EmployeeID);
                }
                else if (user.RoleID == (int)RolesEnum.Client)
                {
                    return new RedirectResult("~/Client/Home");
                }

                return new RedirectResult(FormsAuthentication.DefaultUrl);
            }

            ViewBag.LoginFailed = true;
            ViewBag.Error = "BadLoginPassword";
            return View();
        }

        public ActionResult Logout()
        {
            HttpContext.CurrentUser(null);
            //HttpContext.CurrentCompany(null);
            FormsAuthentication.SignOut();

            return new RedirectResult(FormsAuthentication.LoginUrl);
        }

        [HttpPost]
        public ActionResult ChangePassword(string OldPassword, string NewPassword)
        {
            int currentUserID = HttpContext.CurrentUser().ID;
            User user = db.Users.FirstOrDefault(val => val.ID == currentUserID);

            if (user.Password != OldPassword.ToSha1Base64String())
            {
                return this.GetJsonResult(202, Resources.ModelErrorMessages.InvalidOldPassword);
            }

            user.Password = NewPassword.ToSha1Base64String();
            db.SaveChanges();

            return this.GetJsonResult(200, Resources.ModelErrorMessages.PasswordChanged);
        }

        public ActionResult Edit()
        {
            //string settingsName = "/User/Edit";
            User user = HttpContext.CurrentUser();
            user = db.Users.FirstOrDefault(val => val.ID == user.ID);
            var data = new
            {
                User = user.ToJson()
            };

            ViewBag.UserProfile = true;
            ViewBag.SystemSettings = true;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "User.Edit";
            return View();
        }

        [HttpPost]
        public JsonResult CheckLogin(string Login)
        {
            return new JsonResult() { Data = new { Result = !db.Users.Any(u => !u.Deleted && u.Login.Equals(Login, StringComparison.OrdinalIgnoreCase)) } };
        }

        [HttpPost]
        public ActionResult SaveSettings(string Name, string Value)
        {
            //System.Threading.Thread.CurrentThread.Join(2000);
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            Models.UserSetting setting = db.UserSettings.FirstOrDefault(val => val.Name == Name && val.UserID == userID);

            if (setting == null)
            {
                setting = new UserSetting();
                setting.Name = Name;
                setting.UserID = userID;
                db.UserSettings.AddObject(setting);
            }

            setting.Value = Value;
            db.SaveChanges();

            return this.GetJsonResult(200, setting.ToJson());
        }

        [HttpPost]
        public JsonResult GetCurrent()
        {
            return this.GetJsonResult(200, HttpContext.CurrentUser().ToJson());
        }

        [Authorize(Roles = "admin,boss,watcher")]
        public ActionResult List()
        {
            string settingsName = "/User/List";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;
            var data = new
            {
                Users = db.Users.Where(val => !val.Deleted).ToList().Select(u => u.ToJson()).ToList(),
                Roles = db.Roles.ToList().Select(r => r.ToJson()).ToList(),
                Settings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.SystemSettings = true;
            ViewBag.Data = serializer.Serialize(data);
            ViewBag.Page = "User.List";
            return View();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            db.Dispose();
        }

        #region Helper methods
        protected bool AuthenticateUser(string Login, string Password, bool RememberMe = false)
        {
            FormsIdentity id;
            GenericPrincipal principal;
            HttpCookie cookie;
            string hash;
            Models.User user;
            Models.BuildingEntities db;
            string shaPassword = string.Empty;
            FormsAuthenticationTicket ticket;
            Models.MembershipProvider mp;

            mp = new Models.MembershipProvider();
            if (mp.ValidateUser(Login, Password))
            {
                using (db = new Models.BuildingEntities())
                {
                    user = db.Users.FirstOrDefault(u => u.Login == Login && !u.Deleted);
                    user.RoleReference.Load();
                    user.LastLoginDate = DateTime.Now;
                    db.SaveChanges();
                }
            }
            else
            {
                return false;
            }

            FormsAuthentication.Initialize();

            ticket = GetAuthorizationCook(user, RememberMe, out hash);

            cookie = new HttpCookie(FormsAuthentication.FormsCookieName, hash);

            if (ticket.IsPersistent)
            {
                cookie.Expires = ticket.Expiration;
            }
            cookie.Expires = ticket.Expiration;
            HttpContext.Response.Cookies.Remove(FormsAuthentication.FormsCookieName);
            HttpContext.Response.Cookies.Add(cookie);

            id = new FormsIdentity(ticket);
            principal = new GenericPrincipal(id, ticket.UserData.Split('|'));
            HttpContext.User = principal;
            HttpContext.Session[FormsAuthentication.FormsCookieName] = user;

            return true;
        }
        private static FormsAuthenticationTicket GetAuthorizationCook(Models.User User, bool IsPersistent, out string CookHash)
        {
            string role;
            FormsAuthenticationTicket ticket;
            DateTime expire;

            if (IsPersistent)
            {
                expire = DateTime.Now.AddMonths(1);
            }
            else
            {
                expire = DateTime.Now.AddMinutes(30);
            }

            role = User.Role.SysName;
            ticket = new FormsAuthenticationTicket(1, User.Login, DateTime.Now, expire, IsPersistent, role, FormsAuthentication.FormsCookiePath);
            CookHash = FormsAuthentication.Encrypt(ticket);
            return ticket;
        }
        #endregion
    }
}
