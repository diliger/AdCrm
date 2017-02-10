using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Security;

namespace AdCrm.Models
{
    public class RoleProvider : System.Web.Security.RoleProvider
    {
        private const string NotSupported = "This methos is not supported";

        public override void AddUsersToRoles(string[] usernames, string[] roleNames)
        {
            throw new Exception(NotSupported);
        }

        public override string ApplicationName
        {
            get
            {
                return "AdCrm";
            }
            set
            {

            }
        }

        public override void CreateRole(string roleName)
        {
            throw new Exception(NotSupported);
        }

        public override bool DeleteRole(string roleName, bool throwOnPopulatedRole)
        {
            throw new Exception(NotSupported);
        }

        public override string[] FindUsersInRole(string roleName, string usernameToMatch)
        {
            throw new Exception(NotSupported);
        }

        public override string[] GetAllRoles()
        {
            List<string> roles;
            BuildingEntities db;

            using (db = new BuildingEntities())
            {
                roles = db.Roles.Select(val => val.SysName).ToList();
            }
            
            return roles.ToArray();
        }

        public override string[] GetRolesForUser(string username)
        {
            User user;
            BuildingEntities db;
            List<string> roles = new List<string>();

            using (db = new BuildingEntities())
            {
                user = db.Users.FirstOrDefault(val => val.Login == username);
                roles.Add(user.Role.SysName);
            }
            
            return roles.ToArray();
        }

        public override string[] GetUsersInRole(string roleName)
        {
            BuildingEntities db;
            List<string> users = new List<string>();

            using (db = new BuildingEntities())
            {
                users = db.Roles.FirstOrDefault(val => val.SysName == roleName).Users.Select(val => val.Login).ToList();
            }

            return users.ToArray();
        }

        public override bool IsUserInRole(string username, string roleName)
        {
            User user;
            BuildingEntities db;
            bool result;

            using (db = new BuildingEntities())
            {
                user = db.Users.FirstOrDefault(val => val.Login == username);
                result = user.Role.SysName == roleName;
            }
            
            return result;
        }

        public override void RemoveUsersFromRoles(string[] usernames, string[] roleNames)
        {
            throw new Exception(NotSupported);
        }

        public override bool RoleExists(string roleName)
        {
            BuildingEntities db;
            bool result;

            using (db = new BuildingEntities())
            {
                result = db.Roles.FirstOrDefault(val => val.SysName == roleName) != null;
            }

            return result;
        }
    }
}