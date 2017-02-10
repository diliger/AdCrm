using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EntityJs.Client.Objects;

namespace AdCrm.Models
{
    public partial class ProjectWork : IEntity
    {
        //public decimal CostCustomer
        //{
        //    get
        //    {
        //        return this.CostCustomerNoVat.AddVat();
        //    }
        //}
        //public decimal CostCustomerNoVat
        //{
        //    get
        //    {
        //        return this.Cost;// *100 / (100 - this.Factor);
        //    }
        //}

        //public decimal CostContractor
        //{
        //    get
        //    {
        //        decimal cost = this.ContractorExists ? Math.Floor(this.CostCustomer * (100 - this.Factor)) / 100 : 0;
                
        //        return cost;// this.ContractorVat ? cost.AddVat() : cost;
        //    }
        //}

        public Payment AdvancePayment
        {
            get
            {
                return Payments.FirstOrDefault(val => val.IsAdvance);
            }
        }


        public decimal PayedSum
        {
            get
            {
                return this.Payments.Sum(val => val.Sum);
            }
        }

        //public decimal KickbackSum
        //{
        //    get
        //    {
        //        return Math.Floor(this.CostCustomer * this.Kickback) / 100;
        //    }
        //}

        public decimal Gain
        {
            get
            {
                return this.Cost - (this.ContractorExists ? this.CostContractor : 0);// -this.KickbackSum;
            }
        }

        public string GetName()
        {
            //if (this.DemountTypeID.HasValue)
            //{
            //    string name = this.Name.IsNullOrEmpty() && this.WorkType != null ? (this.WorkType.ShortName ?? this.WorkType.Name) : this.Name;
            //    string demountName = this.DemountType.Name;
            //    string rate = (this.DemountRate ?? 0).ToString("0.##");
            //    string code = this.Code.IsNullOrEmpty() && this.WorkType != null ? this.WorkType.Code : this.Code;

            //    return string.Format("{0} (позиция: {1}, {2}, коэффициент демонтажа - {3}%)", demountName, code, name, rate);
            //}
            //else
            //{
                return this.Name.IsNullOrEmpty() && this.WorkType != null ? (this.WorkType.ShortName ?? this.WorkType.Name) : this.Name;
            //}
        }

        public string GetCode()
        {
            //if (this.DemountTypeID.HasValue)
            //{
            //    return this.DemountType != null ? this.DemountType.Code : "";
            //}
            //else
            //{
                return this.Code.IsNullOrEmpty() && this.WorkType != null ? this.WorkType.Code : this.Code;
            //}
        }

        public object ToJson()
        {
            return new
            {
                this.Comments,
                this.ContractID,
                this.ContractorExists,
                this.ContractorID,
                Cost = this.Price * this.Count,
                this.CreatorID,
                this.ID,
                this.TypeID,
                this.PayedSum,
                this.CreateDate,
                this.ProjectID,
                this.DateEnd,
                this.DaysEnd,
                this.DaysFromTypeID,
                this.DaysTypeID,
                this.Factor,
                this.Count,
                this.Price,
                this.UnitName,
                this.ContractorVat,
                this.CostContractor,
                this.Kickback,
                this.OrderNumber,
                this.DemountTypeID,
                this.DemountRate,
                Name = this.Name.IsNullOrEmpty() && this.WorkType != null ? (this.WorkType.ShortName ?? this.WorkType.Name) : this.Name,
                Code = this.Code.IsNullOrEmpty() && this.WorkType != null ? this.WorkType.Code : this.Code,
                AdvanceDate = AdvancePayment == null ? "" : AdvancePayment.Date.ToShortDateString(),
                AdvanceSum = AdvancePayment == null ? "" : AdvancePayment.Sum.ToDecimalString()
            };
        }


        public void OnCheckPermissions(EntityJs.Client.Events.CheckPermissionsEventArgs e)
        {
            e.Cancel = e.Action != EntityJs.Client.Events.ActionsEnum.Select && Project != null && Project.Archived;
        }

        public void OnSelecting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdating(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleting(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnSelected(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnInserted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnUpdated(EntityJs.Client.Events.EntityEventArgs e)
        {
        }

        public void OnDeleted(EntityJs.Client.Events.EntityEventArgs e)
        {
        }
    }
}