/** @odoo-module */

import { registry } from "@web/core/registry"
import { KpiCard } from "./kpi_card/kpi_card"
import { ChartRenderer } from "./chart_renderer/chart_renderer"
import { loadJS } from "@web/core/assets"
import { useService } from "@web/core/utils/hooks"
const { Component, onWillStart, useRef, onMounted, useState } = owl
import { getColor } from "@web/views/graph/colors"
import { browser } from "@web/core/browser/browser"
import { routeToUrl } from "@web/core/browser/router_service"

export class OwlSalesDashboard extends Component {
    // top products
    async getTopProducts(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date','>', this.state.current_date])
        }

        const data = await this.orm.readGroup("sale.report", domain, ['product_id', 'price_total'], ['product_id'], { limit: 5, orderby: "price_total desc" })

        this.state.topProducts = {
            data: {
                labels: data.map(d => d.product_id[1]),
                  datasets: [
                  {
                    label: 'Total',
                    data: data.map(d => d.price_total),
                    hoverOffset: 4,
                    backgroundColor: data.map((_, index) => getColor(index)),
                  },{
                    label: 'Count',
                    data: data.map(d => d.product_id_count),
                    hoverOffset: 4,
                    backgroundColor: data.map((_, index) => getColor(index)),
                }]
            },
            domain,
            label_field: 'product_id',
        }
    }

    // top sales people
    async getTopSalesPeople(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date','>', this.state.current_date])
        }

        const data = await this.orm.readGroup("sale.report", domain, ['user_id', 'price_total'], ['user_id'], { limit: 5, orderby: "price_total desc" })

        this.state.topSalesPeople = {
            data: {
                labels: data.map(d => d.user_id[1]),
                  datasets: [
                  {
                    label: 'Total',
                    data: data.map(d => d.price_total),
                    hoverOffset: 4,
                    backgroundColor: data.map((_, index) => getColor(index)),
                  }]
            },
            domain,
            label_field: 'user_id',
        }
    }

    // monthly sales
    async getMonthlySales(){
        let domain = [['state', 'in', ['draft','sent','sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date','>', this.state.current_date])
        }

        const data = await this.orm.readGroup("sale.report", domain, ['date', 'state', 'price_total'], ['date', 'state'], { orderby: "date", lazy: false })
        console.log("monthly sales", data)

        const labels = [... new Set(data.map(d => d.date))]
        const quotations = data.filter(d => d.state == 'draft' || d.state == 'sent')
        const orders = data.filter(d => ['sale','done'].includes(d.state))

        this.state.monthlySales = {
            data: {
                labels: labels,
                  datasets: [
                  {
                    label: 'Quotations',
                    data: labels.map(l=>quotations.filter(q=>l==q.date).map(j=>j.price_total).reduce((a,c)=>a+c,0)),
                    hoverOffset: 4,
                    backgroundColor: "red",
                  },{
                    label: 'Orders',
                    data: labels.map(l=>orders.filter(q=>l==q.date).map(j=>j.price_total).reduce((a,c)=>a+c,0)),
                    hoverOffset: 4,
                    backgroundColor: "green",
                }]
            },
            domain,
            label_field: 'date',
        }
    }

    // partner orders
    async getPartnerOrders(){
        let domain = [['state', 'in', ['draft','sent','sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date','>', this.state.current_date])
        }

        const data = await this.orm.readGroup("sale.report", domain, ['partner_id', 'price_total', 'product_uom_qty'], ['partner_id'], { orderby: "partner_id", lazy: false })
        console.log(data)

        this.state.partnerOrders = {
            data: {
                labels: data.map(d => d.partner_id[1]),
                  datasets: [
                  {
                    label: 'Total Amount',
                    data: data.map(d => d.price_total),
                    hoverOffset: 4,
                    backgroundColor: "orange",
                    yAxisID: 'Total',
                    order: 1,
                  },{
                    label: 'Ordered Qty',
                    data: data.map(d => d.product_uom_qty),
                    hoverOffset: 4,
                    //backgroundColor: "blue",
                    type:"line",
                    borderColor: "blue",
                    yAxisID: 'Qty',
                    order: 0,
                }]
            },
            scales: {
                /*Qty: {
                    position: 'right',
                }*/
                yAxes: [
                    { id: 'Qty', position: 'right' },
                    { id: 'Total', position: 'left' },
                ]
            },
            domain,
            label_field: 'partner_id',
        }
    }

    setup(){
        this.state = useState({
            quotations: {
                value:10,
                percentage:6,
            },
            po: {
                waits:1,
                uploaded:2,
                approved:3,

                url: {
                    wait:"/web/waits",
                    upload:"/web/uploads",
                    approve:"/web/approves",
                },

            },
            period:90,
        })
        this.orm = useService("orm")
        this.actionService = useService("action")

        const old_chartjs = document.querySelector('script[src="/web/static/lib/Chart/Chart.js"]')
        const router = useService("router")

        if (old_chartjs){
            let { search, hash } = router.current
            search.old_chartjs = old_chartjs != null ? "0":"1"
            hash.action = 86
            browser.location.href = browser.location.origin + routeToUrl(router.current)
        }

        onWillStart(async ()=>{
            this.getDates()
            // await this.getQuotations()
            // PO
            await this.getTotalPO()
            await this.getWaitingPO()
            await this.getUploadedPO()
            await this.getApprovedPO()

            await this.testOnclickChild()
            
            // PO Urls
            await this.getPoUrlWait()
            
            // Existings
            await this.getOrders()
            await this.getTopProducts()
            await this.getTopSalesPeople()
            await this.getMonthlySales()
            await this.getPartnerOrders()
        })
    }

    async onChangePeriod(){
        this.getDates()
        // await this.getQuotations()
        // PO
        await this.getTotalPO()
        await this.getWaitingPO()
        await this.getUploadedPO()
        await this.getApprovedPO()
        
        await this.testOnclickChild()

        // PO Urls
        await this.getPoUrlWait()

        // Existings
        await this.getOrders()
        await this.getTopProducts()
        await this.getTopSalesPeople()
        await this.getMonthlySales()
        await this.getPartnerOrders()
    }

    getDates(){
        this.state.current_date = moment().subtract(this.state.period, 'days').format('L')
        this.state.previous_date = moment().subtract(this.state.period * 2, 'days').format('L')
    }

    // async getQuotations(){
    //     let domain = [['state', 'in', ['sent', 'draft']]]
    //     if (this.state.period > 0){
    //         domain.push(['date_order','>', this.state.current_date])
    //     }
    //     const data = await this.orm.searchCount("sale.order", domain)
    //     this.state.quotations.value = data

    //     // previous period
    //     let prev_domain = [['state', 'in', ['sent', 'draft']]]
    //     if (this.state.period > 0){
    //         prev_domain.push(['date_order','>', this.state.previous_date], ['date_order','<=', this.state.current_date])
    //     }
    //     const prev_data = await this.orm.searchCount("sale.order", prev_domain)
    //     const percentage = ((data - prev_data)/prev_data) * 100
    //     this.state.quotations.percentage = percentage.toFixed(2)
    // }

    async getTotalPO(){
        let domainTotal = [
            ['state', 'in', ['po','uploaded','approved']],
        ]
        const dataTotal = await this.orm.searchCount("purchase.order", domainTotal)
        this.state.quotations.value = dataTotal
    }

    async getWaitingPO(){
        let domainWaiting = [
            ['status', '=', 'todo'],
            ['res_model', '=', 'purchase.order'],
            ['state', '=', 'planned'],
        ]
        const dataWaits = await this.orm.searchCount("mail.activity", domainWaiting)
        this.state.po.waits = dataWaits
    }

    async getUploadedPO(){
        let domainUploaded = [
            ['status', '=', 'to_approve'],
            ['res_model', '=', 'purchase.order'],
            ['state', '=', 'planned'],
        ]
        const dataUploaded = await this.orm.searchCount("mail.activity", domainUploaded)
        this.state.po.uploaded = dataUploaded
    }

    async getApprovedPO(){
        let domainApproved = [
            ['status', '=', 'approved'],
            ['res_model', '=', 'purchase.order'],
            ['state', '=', 'done'],
        ]
        const dataApproved = await this.orm.searchCount("mail.activity", domainApproved)
        this.state.po.approved = dataApproved
    }

    async getOrders(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }
        const data = await this.orm.searchCount("sale.order", domain)
        //this.state.quotations.value = data

        // previous period
        let prev_domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            prev_domain.push(['date_order','>', this.state.previous_date], ['date_order','<=', this.state.current_date])
        }
        const prev_data = await this.orm.searchCount("sale.order", prev_domain)
        const percentage = ((data - prev_data)/prev_data) * 100
        //this.state.quotations.percentage = percentage.toFixed(2)

        //revenues
        const current_revenue = await this.orm.readGroup("sale.order", domain, ["amount_total:sum"], [])
        const prev_revenue = await this.orm.readGroup("sale.order", prev_domain, ["amount_total:sum"], [])
        const revenue_percentage = ((current_revenue[0].amount_total - prev_revenue[0].amount_total) / prev_revenue[0].amount_total) * 100

        //average
        const current_average = await this.orm.readGroup("sale.order", domain, ["amount_total:avg"], [])
        const prev_average = await this.orm.readGroup("sale.order", prev_domain, ["amount_total:avg"], [])
        const average_percentage = ((current_average[0].amount_total - prev_average[0].amount_total) / prev_average[0].amount_total) * 100

        this.state.orders = {
            value: data,
            percentage: percentage.toFixed(2),
            revenue: `$${(current_revenue[0].amount_total/1000).toFixed(2)}K`,
            revenue_percentage: revenue_percentage.toFixed(2),
            average: `$${(current_average[0].amount_total/1000).toFixed(2)}K`,
            average_percentage: average_percentage.toFixed(2),
        }

        //this.env.services.company
    }

    async getPoUrlWait(){
        let domainAction = [
            ['name', '=', 'To Do List'],
            ['type', '=', 'ir.actions.act_window'],
            ['res_model', '=', 'mail.activity'],
        ]
        let domainMenu = [
            ['name', '=', 'Dashboard'],
            ['web_icon', 'ilike', 'wika_dashboard']
        ]

        const actionId = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)
        console.log("========> TEST <========")
        console.log("act", actionId)
        console.log("menu", menuId)
        let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
        console.log("URELLLL", url)
        console.log("========> TEST <========")

        this.state.po.url.wait = url
    }

    // async viewQuotations(){
    //     let domain = [['state', 'in', ['sent', 'draft']]]
    //     if (this.state.period > 0){
    //         domain.push(['date_order','>', this.state.current_date])
    //     }

    //     let list_view = await this.orm.searchRead("ir.model.data", [['name', '=', 'view_quotation_tree_with_onboarding']], ['res_id'])

    //     this.actionService.doAction({
    //         type: "ir.actions.act_window",
    //         name: "Quotations",
    //         res_model: "sale.order",
    //         domain,
    //         views: [
    //             [list_view.length > 0 ? list_view[0].res_id : false, "list"],
    //             [false, "form"],
    //         ]
    //     })
    // }

    async viewTotalPO(){
        let domainTotalPO = [
            ['state', 'in', ['po','uploaded','approved']],
        ]
        
        let list_view = await this.orm.searchRead("ir.model.data", [['name', '=', 'purchase_order_tree_wika']], ['res_id'])
        let form_view = await this.orm.searchRead("ir.model.data", [['name', '=', 'purchase_order_form_wika']], ['res_id'])

        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "All Purchase Orders in Digital Invoicing",
            res_model: "purchase.order",
            domainTotalPO,
            views: [
                [list_view.length > 0 ? list_view[0].res_id : false, "list"],
                [form_view.length > 0 ? form_view[0].res_id : false, "form"],
            ]
        })
    }

    async testOnclickChild(){
        const tesAwait = await this.orm.searchCount("purchase.order", [['sap_doc_number', '!=', false]])
        console.log('MASUUUUKKK')
        console.log(tesAwait)
        test_masuk_on_click_child
    }        

    viewOrders(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }

        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Quotations",
            res_model: "sale.order",
            domain,
            context: {group_by: ['date_order']},
            views: [
                [false, "list"],
                [false, "form"],
            ]
        })
    }

    viewRevenues(){
        let domain = [['state', 'in', ['sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }

        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Quotations",
            res_model: "sale.order",
            domain,
            context: {group_by: ['date_order']},
            views: [
                [false, "pivot"],
                [false, "form"],
            ]
        })
    }
}

OwlSalesDashboard.template = "owl.OwlSalesDashboard"
OwlSalesDashboard.components = { KpiCard, ChartRenderer }

registry.category("actions").add("owl.sales_dashboard", OwlSalesDashboard)