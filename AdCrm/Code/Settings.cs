using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Caching;
using AdCrm.Models;

namespace AdCrm
{
    public class Settings
    {
        private static string key = "Settings.";
        private static int duration = 30;

        public static string ServerEmail
        {
            get
            {
                return GetValue("ServerEmail");
            }
        }
        public static string ServerEmailName
        {
            get
            {
                return GetValue("ServerEmailName");
            }
        }
        public static string ServerSMTPHost
        {
            get
            {
                return GetValue("ServerSMTPHost");
            }
        }
        public static string ServerSMTPLogin
        {
            get
            {
                return GetValue("ServerSMTPLogin");
            }
        }
        public static string ServerSMTPPassword
        {
            get
            {
                return GetValue("ServerSMTPPassword");
            }
        }
        public static int ServerSMTPPort
        {
            get
            {
                return GetValue("ServerSMTPPort", "25").ToInt();
            }
        }

        public static int HttpCacheDurationMins
        {
            get
            {
                string v = GetValue("HttpCacheDurationMins", "120");
                return v.ToInt();
            }
        }

        public static bool CompressScriptsAndStyles
        {
            get
            {
                return GetValue("CompressScriptsAndStyles", "false").ToBool();
            }
        }

        public static bool CacheStaticDictionaries
        {
            get
            {
                return GetValue("CacheStaticDictionaries", "false").ToBool();
            }
        }
        
        public static string JsDomain
        {
            get
            {
                return GetValue("JsDomain", string.Empty);
            }
        }

        public static string CssDomain
        {
            get
            {
                return GetValue("CssDomain", string.Empty);
            }
        }

        public static string WebsiteRootPath
        {
            get
            {
                throw new NotImplementedException();
            }
        }

        public static int WorkLogMaxDelay
        {
            get
            {
                return GetValue("WorkLogMaxDelay", "5").ToInt();
            }
        }

        public static int LotThumbWidth
        {
            get
            {
                return GetValue("LotThumbWidth", "200").ToInt();
            }
        }

        public static int LotThumbHeight
        {
            get
            {
                return GetValue("LotThumbHeight", "200").ToInt();
            }
        }
        public static decimal PriceSellRate
        {
            get
            {
                return GetValue("PriceSellRate", "1.2").ToDecimalOrDefault() ?? 1.2M;
            }
        }

        public static void Clear(string Name)
        {
            string name = key + Name;
            MemoryCache.Default.Remove(name);
        }

        public static void SetValue(string Name, string Value)
        {
            BuildingEntities db = new BuildingEntities();
            SystemSetting ss = db.SystemSettings.FirstOrDefault(val => val.Name == Name);

            if (ss == null)
            {
                ss = new SystemSetting();
                ss.Name = Name;
                ss.Value = Value;
                ss.Date = DateTime.Now;
                ss.Title = Name;
                db.SystemSettings.AddObject(ss);
            }

            ss.Value = Value;
            db.SaveChanges();
            db.Dispose();
        }

        public static string GetValue(string Name, string Default = "")
        {
            string result = MemoryCache.Default.Get(key + Name) as string;

            if (result.IsNotNullOrEmpty())
            {
                return result;
            }

            BuildingEntities db = new BuildingEntities();
            SystemSetting ss = db.SystemSettings.FirstOrDefault(val => val.Name == Name);

            if (ss == null)
            {
                ss = new SystemSetting();
                ss.Name = Name;
                ss.Value = Default;
                ss.Date = DateTime.Now;
                ss.Title = Name;
                db.SystemSettings.AddObject(ss);
                db.SaveChanges();
            }

            db.Dispose();
            Default = ss.Value;

            MemoryCache.Default.Add(key + Name, Default, new CacheItemPolicy() { AbsoluteExpiration = DateTime.Now.AddMinutes(duration) });

            return Default;
        }

        public static EmailTemplate GetEmailTemplate(string Name)
        {
            string name = Name;
            EmailTemplate result = MemoryCache.Default.Get(key + name) as EmailTemplate;

            if (result != null)
            {
                return result;
            }

            BuildingEntities db = new BuildingEntities();
            EmailTemplate et = db.EmailTemplates.FirstOrDefault(val => val.SysName == name);

            if (et == null)
            {
                User user = db.CurrentUser;
                et = new EmailTemplate();
                et.SysName = Name;
                et.Name = Name;
                et.CreateDate = DateTime.Now;
                et.Creator = user != null ? user.Login : "system";
                db.EmailTemplates.AddObject(et);
                db.SaveChanges();
            }
            MemoryCache.Default.Add(key + name, et, new CacheItemPolicy() { AbsoluteExpiration = DateTime.Now.AddMinutes(duration) });

            db.Dispose();

            return et;
        }


    }
}