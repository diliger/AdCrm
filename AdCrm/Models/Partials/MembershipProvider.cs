using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Security;

namespace AdCrm.Models
{
    public class MembershipProvider : System.Web.Security.MembershipProvider
    {
        public const string ProviderName = "AdCrm.Models.MembershipProvider";

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

        public override bool ChangePassword(string username, string oldPassword, string newPassword)
        {
            BuildingEntities db;
            User user;
            bool result = false;
            using (db = new BuildingEntities())
            {
                user = db.Users.FirstOrDefault(val => val.Login == username && !val.Deleted);
                if (user != null)
                {
                    if ((user.Password.IsNullOrEmpty() && oldPassword.IsNullOrEmpty()) || user.Password.ToSha1Base64String() == oldPassword.ToSha1Base64String())
                    {
                        user.Password = newPassword.ToSha1Base64String();
                        result = true;
                    }
                }
            }
            return result;
        }

        public override bool ChangePasswordQuestionAndAnswer(string username, string password, string newPasswordQuestion, string newPasswordAnswer)
        {
            //To-do;
            return true;
        }

        public override System.Web.Security.MembershipUser CreateUser(string username, string password, string email, string passwordQuestion, string passwordAnswer, bool isApproved, object providerUserKey, out System.Web.Security.MembershipCreateStatus status)
        {
            BuildingEntities db;
            User user;
            int count;
            System.Web.Security.MembershipUser result = null;
            status = System.Web.Security.MembershipCreateStatus.Success;

            using (db = new BuildingEntities())
            {
                count = db.Users.Where(val => val.Login.ToLower() == username.ToLower() && !val.Deleted).Count();

                if (count > 0)
                {
                    status = System.Web.Security.MembershipCreateStatus.DuplicateUserName;
                }
                else
                {
                    user = new User();
                    user.Login = username;
                    user.Password = password.ToSha1Base64String();
                    user.Name = string.Empty;
                    user.Surname = string.Empty;
                    user.Patronymic = string.Empty;
                    db.Users.AddObject(user);
                    db.SaveChanges();
                    result = ConvertUser(user);
                }
            }
            return result;
        }

        public override bool DeleteUser(string username, bool deleteAllRelatedData)
        {
            //throw new NotImplementedException();
            return false;
        }

        public override bool EnablePasswordReset
        {
            get
            {
                //throw new NotImplementedException(); 
                return false;
            }
        }

        public override bool EnablePasswordRetrieval
        {
            get
            {
                //throw new NotImplementedException(); 
                return false;
            }
        }

        public override MembershipUserCollection FindUsersByEmail(string emailToMatch, int pageIndex, int pageSize, out int totalRecords)
        {
            totalRecords = 0;
            return null;
        }

        public override System.Web.Security.MembershipUserCollection FindUsersByName(string usernameToMatch, int pageIndex, int pageSize, out int totalRecords)
        {
            BuildingEntities db;
            List<User> users;
            MembershipUserCollection result;
            totalRecords = 0;
            using (db = new BuildingEntities())
            {
                totalRecords = db.Users.Where(val => val.Login == usernameToMatch && !val.Deleted).Count();
                users = db.Users.Where(val => val.Login == usernameToMatch && !val.Deleted).OrderBy(val => val.ID).Skip(pageIndex * pageSize).Take(pageSize).ToList();
            }
            result = ConvertUsers(users);
            return result;
        }

        public override System.Web.Security.MembershipUserCollection GetAllUsers(int pageIndex, int pageSize, out int totalRecords)
        {
            BuildingEntities db;
            List<User> users;
            MembershipUserCollection result;
            totalRecords = 0;
            using (db = new BuildingEntities())
            {
                totalRecords = db.Users.Where(val => !val.Deleted).Count();
                users = db.Users.Where(val => !val.Deleted).OrderBy(val => val.ID).Skip(pageIndex * pageSize).Take(pageSize).ToList();
            }
            result = ConvertUsers(users);
            return result;
        }

        public override int GetNumberOfUsersOnline()
        {
            //To do.
            return 0;
        }

        public override string GetPassword(string username, string answer)
        {
            //To do.
            BuildingEntities db;
            User user;
            string result = null;
            using (db = new BuildingEntities())
            {
                user = db.Users.FirstOrDefault(val => val.Login == username && !val.Deleted);
                if (user != null)
                {
                    if (answer == "111")
                    {
                        user.Password = "111".ToSha1Base64String();
                        result = "111";
                        db.SaveChanges();
                    }
                }
            }
            return result;
        }

        public override System.Web.Security.MembershipUser GetUser(string username, bool userIsOnline)
        {
            BuildingEntities db;
            User user;
            MembershipUser result = null;
            using (db = new BuildingEntities())
            {
                user = db.Users.FirstOrDefault(val => val.Login == username && !val.Deleted);
                if (user != null)
                {
                    result = ConvertUser(user);
                }
            }
            return result;
        }

        public override System.Web.Security.MembershipUser GetUser(object providerUserKey, bool userIsOnline)
        {
            BuildingEntities db;
            User user;
            MembershipUser result = null;
            int id;
            
            if (providerUserKey is int)
            {
                id = (int)providerUserKey;
            }
            else
            {
                id = providerUserKey.ToString().ToInt();
            }

            using (db = new BuildingEntities())
            {
                user = db.Users.FirstOrDefault(val => val.ID == id && !val.Deleted);
                if (user != null)
                {
                    result = ConvertUser(user);
                }
            }
            return result;
        }

        public override string GetUserNameByEmail(string email)
        {
            throw new NotImplementedException(); 
        }

        public override int MaxInvalidPasswordAttempts
        {
            get
            {
                //throw new NotImplementedException(); 
                return 10;
            }
        }

        public override int MinRequiredNonAlphanumericCharacters
        {
            get
            {
                //throw new NotImplementedException(); 
                return 0;
            }
        }

        public override int MinRequiredPasswordLength
        {
            get
            {
                //throw new NotImplementedException(); 
                return 3;
            }
        }

        public override int PasswordAttemptWindow
        {
            get
            {
                //throw new NotImplementedException(); 
                return 0;
            }
        }

        public override System.Web.Security.MembershipPasswordFormat PasswordFormat
        {
            get
            {
                //throw new NotImplementedException(); 
                return MembershipPasswordFormat.Hashed;
            }
        }

        public override string PasswordStrengthRegularExpression
        {
            get
            {
                //throw new NotImplementedException(); 
                return ".+";
            }
        }

        public override bool RequiresQuestionAndAnswer
        {
            get
            {
                return false;
            }
        }

        public override bool RequiresUniqueEmail
        {
            get
            {
                return true;
            }
        }

        public override string ResetPassword(string username, string answer)
        {
            return this.GetPassword(username, answer);
        }

        public override bool UnlockUser(string userName)
        {
            //throw new NotImplementedException();
            return true;
        }

        public override void UpdateUser(System.Web.Security.MembershipUser User)
        {
            throw new NotImplementedException();
        }

        public override bool ValidateUser(string username, string password)
        {
            BuildingEntities db;
            User user;
            bool result;

            password = password.ToSha1Base64String();

            using (db = new BuildingEntities())
            {
                user = db.Users.FirstOrDefault(val => val.Login == username && (val.Password == password || val.Password == string.Empty) && !val.Blocked && !val.Deleted);
                if (user != null && user.RoleID == (int)RolesEnum.Employee)
                {
                    user.EmployeeReference.Load();
                    Employee e = user.Employee;
                    user = e == null || e.Archived || e.Deleted ? null : user;
                }

                if(user != null && user.Password.IsNullOrEmpty())
                {
                    user.Password = password;
                    db.SaveChanges();
                }
            }
            result = user != null;
            return result;
        }

        protected User ConvertUser(MembershipUser User)
        {
            Models.User user;
            user = new User();
            user.ID = User.ProviderUserKey.ToString().ToInt();
            user.Login = User.UserName;
            return user;
        }
        protected MembershipUser ConvertUser(User User)
        {
            return new MembershipUser(ProviderName, User.Login, User.ID, string.Empty, "Password question", string.Empty, true, false, DateTime.Now, DateTime.Now, DateTime.Now, DateTime.Now, DateTime.Now);
        }
        protected MembershipUserCollection ConvertUsers(List<User> Users)
        {
            MembershipUserCollection result = new MembershipUserCollection();
            Users.ForEach(val =>
            {
                result.Add(ConvertUser(val));
            });
            return result;
        }
    }
}