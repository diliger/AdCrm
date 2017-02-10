using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using AdCrm.Models;

namespace AdCrm.Controllers
{
    public class CustomerController : BaseController
    {
        public ActionResult Index(int ID)
        {
            int[] refbookIDs = new[] { (int)RefbookTypesEnum.ContactPersonTypes, (int)RefbookTypesEnum.ContractorNoteTypes };
            int[] statbookIDs = new[] { (int)StatbookTypesEnum.Genders };

            string settingsName = "Customer/Index";
            User user = HttpContext.CurrentUser();
            int userID = user.ID;

            Contractor customer = db.Contractors.FirstOrDefault(val => val.ID == ID && !val.Deleted && val.RoleID == (int)BuildingEntities.ContractorRolesEnum.Customer);
            List<User> users = db.Users.Where(val => !val.Deleted && !val.Blocked && val.RoleID > (int)RolesEnum.Admin && val.RoleID < (int)RolesEnum.Employee || val.ResponsibleContractors.Any(c => !c.Deleted)).ToList();

            object data = new
            {
                Customer = customer.ToJson(),
                Users = users.Select(val => val.ToJson()).ToList(),
                ContractorTypes = db.ContractorTypes.ToList().Select(val => val.ToJson()).ToList(),
                ContractorSubTypes = db.ContractorSubTypes.ToList().Select(val => val.ToJson()).ToList(),
                InformationSources = db.InformationSources.ToList().Select(val => val.ToJson()).ToList(),
                ContactTypes = db.ContactTypes.ToList().Select(val => val.ToJson()).ToList(),
                LegalDetails = db.LegalDetails.Where(val => val.ContractorID == ID).ToList().Select(val => val.ToJson()).ToList(),
                PhysicalDetails = db.PhysicalDetails.Where(val => val.ContractorID == ID).ToList().Select(val => val.ToJson()).ToList(),
                ContractorFiles = db.ContractorFiles.Where(val => val.ContractorID == ID).ToList().Select(val => val.ToJson()).ToList(),
                ContactPersons = db.ContactPersons.Where(val => val.ContractorID == ID).ToList().Select(val => val.ToJson()).ToList(),
                Contacts = db.Contacts.Where(val => val.ContactPerson.ContractorID == ID).ToList().Select(val => val.ToJson()).ToList(),
                Refbooks = db.Refbooks.Where(val => refbookIDs.Contains(val.TypeID)).ToList().Select(val => val.ToJson()).ToList(),
                Statbooks = db.Statbooks.Where(val => statbookIDs.Contains(val.TypeID)).ToList().Select(val => val.ToJson()).ToList(),
                ContractorStatuses = db.ContractorStatuses.ToList().Select(val => val.ToJson()).ToList(),
                //Contracts = db.Contracts.Where(val => val.ContractorID == ID && !val.Deleted && val.RoleID == (int)BuildingEntities.ContractRolesEnum.WithCustomerFrame).ToList().Select(val => val.ToJson()).ToList(),
                UserSettings = db.UserSettings.Where(val => val.UserID == userID && val.Name.IndexOf(settingsName) == 0).ToList().Select(val => val.ToJson()).ToList()
            };

            ViewBag.MainJs = false;
            ViewBag.Customer = customer;
            ViewBag.Page = "Customer.Index";
            return ViewWithData(data);
        }

        //[HttpPost]
        //public JsonResult ClearWorkContract(int ID)
        //{
        //    ContractorWorkContract cwc = db.ContractorWorkContracts.FirstOrDefault(val => val.ID == ID);
        //    if (cwc == null)
        //        return Json(new { Success = false });

        //    List<ContractorWorkContractPage> pages = cwc.ContractorWorkContractPages.ToList();
        //    foreach (ContractorWorkContractPage page in pages)
        //    {
        //        EntityJs.Client.Events.EntityEventArgs e = new EntityJs.Client.Events.EntityEventArgs(db, "ContractorWorkContractPages", "ContractorWorkContractPage", page, EntityJs.Client.Events.ActionsEnum.Delete);
        //        page.OnDeleting(e);
        //        db.ContractorWorkContractPages.DeleteObject(page);
        //        page.OnDeleted(e);
        //    }
        //    db.SaveChanges();
        //    return Json(new { Success = true });
        //}

        public FileResult WorksTemplate()
        {
            return File(System.IO.Path.Combine(HttpRuntime.AppDomainAppPath, "Templates", "ContractorWorks.xlsx"), DataController.XlsxContentType, "ШаблонДляИмпортаЦен.xlsx");
        }

        //[HttpPost]
        //public JsonResult ImportWorks(int ID, int FileID, int CodeColumn = 1, int NameColumn = 2, int UnitColumn = 3, int PriceColumn = 4)
        //{
        //    int startRow = 2;//, nameColumn = 2, unitColumn = 3, priceColumn = 4, codeColumn = 1;
        //    string demountKey = "демонтаж";
        //    DateTime date = DateTime.Now;
        //    int userID = db.CurrentUser.ID;
        //    File file = db.Files.FirstOrDefault(val => val.ID == FileID);
        //    ContractorWorkContract contract = db.ContractorWorkContracts.FirstOrDefault(val => val.ID == ID);
        //    if (file == null || !file.Url.EndsWith(".xlsx") || contract == null)
        //        return Json(new { Success = false });

        //    System.IO.FileInfo fi = new System.IO.FileInfo(file.RealPath);
        //    if (!fi.Exists)
        //        return Json(new { Success = false });

        //    Dictionary<string, WorkType> workTypes = new Dictionary<string, WorkType>();
        //    Dictionary<string, DemountType> demountTypes = new Dictionary<string, DemountType>();
        //    try
        //    {
        //        using (OfficeOpenXml.ExcelPackage excel = new OfficeOpenXml.ExcelPackage(fi))
        //        {
        //            for (int i = 0; i < excel.Workbook.Worksheets.Count; i++)
        //            {
        //                OfficeOpenXml.ExcelWorksheet sheet = excel.Workbook.Worksheets[i + 1];
        //                string sheetSysName = sheet.Name.ReplaceRegex("[^A-Za-zА-Яа-я0-9]", "").ToLower();
        //                ContractorWorkContractPage page = db.ContractorWorkContractPages.FirstOrDefault(val => val.SysName == sheetSysName && val.ContractID == ID && !val.Deleted);
        //                if (page == null)
        //                {
        //                    page = new ContractorWorkContractPage()
        //                    {
        //                        ChangeDate = date,
        //                        ChangerID = userID,
        //                        ContractID = ID,
        //                        ContractorID = contract.ContractorID,
        //                        CreateDate = date,
        //                        CreatorID = userID,
        //                        Name = sheet.Name,
        //                        SysName = sheetSysName
        //                    };
        //                    db.ContractorWorkContractPages.AddObject(page);
        //                }

        //                for (int j = startRow; j <= sheet.Dimension.End.Row - sheet.Dimension.Start.Row + 1; j++)
        //                {
        //                    string name = sheet.Cells[j, NameColumn].Text.Trim();
        //                    string sysName = name.ReplaceRegex("[^A-Za-zА-Яа-я0-9]", "").ToLower();
        //                    string sysComments = string.Join(" | ", sheet.Cells[j, sheet.Dimension.Start.Column, j, sheet.Dimension.End.Column].Select(val => val.Text));
        //                    if (name.IsNullOrEmpty() || sysName.IsNullOrEmpty())
        //                        continue;

        //                    string unit = sheet.Cells[j, UnitColumn].Text;
        //                    decimal price = sheet.Cells[j, PriceColumn].Text.ReplaceRegex("[^0-9.,]", "").ToDecimal();
        //                    string code = sheet.Cells[j, CodeColumn].Text;
        //                    if (name.ToLower().StartsWith(demountKey.ToLower()))
        //                    {
        //                        ImportContractorDemount(contract, page, demountTypes, sysName, code, name, unit, price, sysComments);
        //                    }
        //                    else
        //                    {
        //                        ImportContractorWork(contract, page, workTypes, sysName, code, name, unit, price, sysComments);
        //                    }
        //                }
        //            }
        //            db.SaveChanges();
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        return Json(new { Success = false, Error = ex.GetExceptionTextAndStackTrace() });
        //    }
        //    return Json(new { Success = true });
        //}

        //private void ImportContractorWork(ContractorWorkContract contract, ContractorWorkContractPage page, Dictionary<string, WorkType> workTypes, string workSysName, string code, string name, string unit, decimal price, string sysComments)
        //{
        //    DateTime date = DateTime.Now;
        //    int userID = db.CurrentUser.ID;
        //    WorkType workType;
        //    if (!workTypes.TryGetValue(workSysName, out workType))
        //    {
        //        workType = db.WorkTypes.FirstOrDefault(val => !val.Deleted && val.SysName == workSysName);
        //    }
        //    if (workType == null)
        //    {
        //        workType = new WorkType
        //        {
        //            CompanyID = db.CurrentCompany.ID,
        //            Name = name,
        //            SysName = workSysName,
        //            UnitName = unit,
        //            Code = code
        //        };
        //        db.WorkTypes.AddObject(workType);
        //    }
        //    workTypes[workSysName] = workType;
        //    ContractorWork work = null;
        //    if (workType.ID > 0 && page.ID > 0)
        //    {
        //        work = db.ContractorWorks.FirstOrDefault(val => val.PageID == page.ID && val.WorkTypeID == workType.ID);
        //    }
        //    if (work == null)
        //    {
        //        work = new ContractorWork()
        //        {
        //            ChangeDate = date,
        //            ChangerID = userID,
        //            ContractID = contract.ID,
        //            ContractorID = contract.ContractorID,
        //            CreateDate = date,
        //            CreatorID = userID,
        //            PageID = page.ID,
        //            ContractorWorkContractPage = page,
        //            Price = price,
        //            WorkTypeID = workType.ID,
        //            WorkType = workType,
        //            Code = code
        //        };
        //        db.ContractorWorks.AddObject(work);
        //    }
        //    work.Price = price;
        //    work.Code = code;
        //    work.SysComments = sysComments;// string.Join(" | ", sheet.Cells[j, sheet.Dimension.Start.Column, j, sheet.Dimension.End.Column].Select(val => val.Text));
        //}
        //private void ImportContractorDemount(ContractorWorkContract contract, ContractorWorkContractPage page, Dictionary<string, DemountType> demountTypes, string sysName, string code, string name, string unit, decimal rate, string sysComments)
        //{
        //    DateTime date = DateTime.Now;
        //    int userID = db.CurrentUser.ID;
        //    DemountType demountType;
        //    if (!demountTypes.TryGetValue(sysName, out demountType))
        //    {
        //        demountType = db.DemountTypes.FirstOrDefault(val => !val.Deleted && val.SysName == sysName);
        //    }
        //    if (demountType == null)
        //    {
        //        demountType = new DemountType
        //        {
        //            CompanyID = db.CurrentCompany.ID,
        //            Name = name,
        //            SysName = sysName,
        //            Code = code
        //        };
        //        db.DemountTypes.AddObject(demountType);
        //    }
        //    demountTypes[sysName] = demountType;
        //    ContractorDemount demount = null;
        //    if (demountType.ID > 0 && page.ID > 0)
        //    {
        //        demount = db.ContractorDemounts.FirstOrDefault(val => val.PageID == page.ID && val.DemountTypeID == demountType.ID);
        //    }
        //    if (demount == null)
        //    {
        //        demount = new ContractorDemount()
        //        {
        //            ChangeDate = date,
        //            ChangerID = userID,
        //            ContractID = contract.ID,
        //            ContractorID = contract.ContractorID,
        //            CreateDate = date,
        //            CreatorID = userID,
        //            PageID = page.ID,
        //            ContractorWorkContractPage = page,
        //            Rate = rate,
        //            DemountTypeID = demountType.ID,
        //            DemountType = demountType,
        //            Code = code
        //        };
        //        db.ContractorDemounts.AddObject(demount);
        //    }
        //    demount.Rate = rate;
        //    demount.Code = code;
        //    demount.SysComments = sysComments;
        //}
    }
}
