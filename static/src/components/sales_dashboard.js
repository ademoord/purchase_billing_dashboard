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
    // async getTopSalesPeople(){
    //     let domain = [['state', 'in', ['sale', 'done']]]
    //     if (this.state.period > 0){
    //         domain.push(['date','>', this.state.current_date])
    //     }

    //     const data = await this.orm.readGroup("sale.report", domain, ['user_id', 'price_total'], ['user_id'], { limit: 5, orderby: "price_total desc" })

    //     this.state.topSalesPeople = {
    //         data: {
    //             labels: data.map(d => d.user_id[1]),
    //               datasets: [
    //               {
    //                 label: 'Total',
    //                 data: data.map(d => d.price_total),
    //                 hoverOffset: 4,
    //                 backgroundColor: data.map((_, index) => getColor(index)),
    //               }]
    //         },
    //         domain,
    //         label_field: 'user_id',
    //     }
    // }

    // digital invoice by stages
    async getDigitalInvoiceReport() {
        let domainPo = [['state', 'in', ['po', 'uploaded', 'approved']]];
        let domainGrses = [['state', 'in', ['waits', 'uploaded', 'approved']]];
        let domainBap = [['state', 'in', ['draft', 'upload', 'approve']]];
        let domainInv = [['state', 'in', ['draft', 'upload', 'approve']]];
        let domainPr = [['state', 'in', ['draft', 'upload', 'request', 'approve']]];
    
        const totalPo = await this.orm.searchCount("purchase.order", domainPo);
        const totalGrses = await this.orm.searchCount("stock.picking", domainGrses);
        const totalBap = await this.orm.searchCount("wika.berita.acara.pembayaran", domainBap);
        const totalInv = await this.orm.searchCount("account.move", domainInv);
        const totalPr = await this.orm.searchCount("wika.payment.request", domainPr);
    
        const data = [
            { label: 'Purchase Orders in Digital Invoicing', count: totalPo },
            { label: 'GR/SES in Digital Invoicing', count: totalGrses },
            { label: 'Berita Acara Pembayaran in Digital Invoicing', count: totalBap },
            { label: 'Invoice in Digital Invoicing', count: totalInv },
            { label: 'Pengajuan Pembayaran in Digital Invoicing', count: totalPr },
        ];
    
        this.state.digitalInvoiceReport = {
            data: {
                labels: data.map(d => d.label),
                datasets: [
                    {
                        label: 'Total',
                        data: data.map(d => d.count),
                        hoverOffset: 4,
                        backgroundColor: data.map((_, index) => getColor(index)),
                    },
                ],
            },
            domain: [domainPo, domainGrses, domainBap, domainInv, domainPr],
            label_field: 'label',
        };
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
                total:100,
                waits:1,
                uploaded:2,
                late:3,

                url: {
                    wait:"/web/po/waits",
                    upload:"/web/po/uploads",
                    late:"/web/po/lates",
                },
            },

            grses: {
                total:100,
                waits:1,
                uploaded:2,
                late:3,

                url: {
                    wait:"/web/grses/waits",
                    upload:"/web/grses/uploads",
                    late:"/web/grses/lates",
                },
            },

            bap: {
                total:100,
                waits:1,
                uploaded:2,
                late:3,

                url: {
                    wait:"/web/bap/waits",
                    upload:"/web/bap/uploads",
                    late:"/web/bap/lates",
                },
            },

            inv: {
                total:100,
                waits:1,
                uploaded:2,
                late:3,

                url: {
                    wait:"/web/inv/waits",
                    upload:"/web/inv/uploads",
                    late:"/web/inv/lates",
                },
            },

            pr: {
                total:100,
                waits:1,
                uploaded:2,
                late:3,

                url: {
                    wait:"/web/pr/waits",
                    upload:"/web/pr/uploads",
                    late:"/web/pr/lates",
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
            await this.getLatePO()
            // PO Urls
            await this.getPoUrlWait()
            await this.getPoUrlUpload()
            await this.getPoUrlLate()

            // GRSES
            await this.getTotalGRSES()
            await this.getWaitingGRSES()
            await this.getUploadedGRSES()
            await this.getLateGRSES()
            // GRSES Urls
            await this.getGrsesUrlWait()
            await this.getGrsesUrlUpload()
            await this.getGrsesUrlLate()

            // BAP
            await this.getTotalBAP()
            await this.getWaitingBAP()
            await this.getUploadedBAP()
            await this.getLateBAP()
            // BAP Urls
            await this.getBapUrlWait()
            await this.getBapUrlUpload()
            await this.getBapUrlLate()

            // INV
            await this.getTotalINV()
            await this.getWaitingINV()
            await this.getUploadedINV()
            await this.getLateINV()
            // INV Urls
            await this.getInvUrlWait()
            await this.getInvUrlUpload()
            await this.getInvUrlLate()

            // PR
            await this.getTotalPR()
            await this.getWaitingPR()
            await this.getUploadedPR()
            await this.getLatePR()
            // PR Urls
            await this.getPrUrlWait()
            await this.getPrUrlUpload()
            await this.getPrUrlLate()

            // New Pie
            await this.getDigitalInvoiceReport()
            
            // Existings
            await this.getOrders()
            await this.getTopProducts()
            // await this.getTopSalesPeople()
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
        await this.getLatePO()
        // PO Urls
        await this.getPoUrlWait()
        await this.getPoUrlUpload()
        await this.getPoUrlLate()

        // GRSES
        await this.getTotalGRSES()
        await this.getWaitingGRSES()
        await this.getUploadedGRSES()
        await this.getLateGRSES()
        // GRSES Urls
        await this.getGrsesUrlWait()
        await this.getGrsesUrlUpload()
        await this.getGrsesUrlLate()

        // BAP
        await this.getTotalBAP()
        await this.getWaitingBAP()
        await this.getUploadedBAP()
        await this.getLateBAP()
        // BAP Urls
        await this.getBapUrlWait()
        await this.getBapUrlUpload()
        await this.getBapUrlLate()

        // INV
        await this.getTotalINV()
        await this.getWaitingINV()
        await this.getUploadedINV()
        await this.getLateINV()
        // INV Urls
        await this.getInvUrlWait()
        await this.getInvUrlUpload()
        await this.getInvUrlLate()

        // PR
        await this.getTotalPR()
        await this.getWaitingPR()
        await this.getUploadedPR()
        await this.getLatePR()
        // PR Urls
        await this.getPrUrlWait()
        await this.getPrUrlUpload()
        await this.getPrUrlLate()
        
        // New Pie
        await this.getDigitalInvoiceReport()
        

        // Existings
        await this.getOrders()
        await this.getTopProducts()
        // await this.getTopSalesPeople()
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


    // === PO COUNTERS ===
    async getTotalPO(){
        let domainTotal = [
            ['state', 'in', ['po','uploaded','approved']],
        ]
        const dataTotal = await this.orm.searchCount("purchase.order", domainTotal)
        this.state.po.total = dataTotal
    }
    async getWaitingPO(){
        let domainWaiting = [
            ['status', '=', 'todo'],
            ['res_model', '=', 'purchase.order'],
            ['state', 'in', ['today','planned']],
        ]
        const dataWaits = await this.orm.searchCount("mail.activity", domainWaiting)
        console.log("dataWaits", dataWaits)
        this.state.po.waits = dataWaits
    }
    async getUploadedPO(){
        let domainUploaded = [
            ['status', '=', 'to_approve'],
            ['res_model', '=', 'purchase.order'],
            ['state', 'in', ['today','planned']],
            // ['state', '=', 'planned'],
        ]
        const dataUploaded = await this.orm.searchCount("mail.activity", domainUploaded)
        console.log("dataUploaded", dataUploaded)
        this.state.po.uploaded = dataUploaded
    }
    async getLatePO(){
        // let today = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
        let domainLate = [
            // ['status', '=', 'approved'],
            // ['date_deadline', '<', today.toString()]
            ['res_model', '=', 'purchase.order'],
            ['state', '=', 'overdue']
        ]
        const dataLate = await this.orm.searchCount("mail.activity", domainLate)
        console.log("dataLate", dataLate)
        this.state.po.late = dataLate
    }
    // ======================

    // === GRSES COUNTERS ===
    async getTotalGRSES(){
        let domainTotal = [
            ['state', 'in', ['waits','uploaded','approved']],
        ]
        const dataTotal = await this.orm.searchCount("stock.picking", domainTotal)
        this.state.grses.total = dataTotal
    }
    async getWaitingGRSES(){
        let domainWaiting = [
            ['status', '=', 'todo'],
            ['res_model', '=', 'stock.picking'],
            ['state', 'in', ['today','planned']],
        ]
        const dataWaits = await this.orm.searchCount("mail.activity", domainWaiting)
        this.state.grses.waits = dataWaits
    }
    async getUploadedGRSES(){
        let domainUploaded = [
            ['status', '=', 'to_approve'],
            ['res_model', '=', 'stock.picking'],
            ['state', 'in', ['today','planned']],
        ]
        const dataUploaded = await this.orm.searchCount("mail.activity", domainUploaded)
        this.state.grses.uploaded = dataUploaded
    }
    async getLateGRSES(){
        let domainLate = [
            ['res_model', '=', 'stock.picking'],
            ['state', '=', 'overdue']
        ]
        const dataLate = await this.orm.searchCount("mail.activity", domainLate)
        this.state.grses.late = dataLate
    }
    // ======================
    
    // === BAP COUNTERS ===
    async getTotalBAP(){
        let domainTotal = [
            ['state', 'in', ['draft','upload','approve']],
        ]
        const dataTotal = await this.orm.searchCount("wika.berita.acara.pembayaran", domainTotal)
        this.state.bap.total = dataTotal
    }
    async getWaitingBAP(){
        let domainWaiting = [
            ['status', '=', 'todo'],
            ['res_model', '=', 'wika.berita.acara.pembayaran'],
            ['state', 'in', ['today','planned']],
        ]
        const dataWaits = await this.orm.searchCount("mail.activity", domainWaiting)
        this.state.bap.waits = dataWaits
    }
    async getUploadedBAP(){
        let domainUploaded = [
            ['status', '=', 'to_approve'],
            ['res_model', '=', 'wika.berita.acara.pembayaran'],
            ['state', 'in', ['today','planned']],
        ]
        const dataUploaded = await this.orm.searchCount("mail.activity", domainUploaded)
        this.state.bap.uploaded = dataUploaded
    }
    async getLateBAP(){
        let domainLate = [
            ['res_model', '=', 'wika.berita.acara.pembayaran'],
            ['state', '=', 'overdue']
        ]
        const dataLate = await this.orm.searchCount("mail.activity", domainLate)
        this.state.bap.late = dataLate
    }
    // ======================

    // === INVOICE COUNTERS ===
    async getTotalINV(){
        let domainTotal = [
            ['state', 'in', ['draft','upload','approve']],
        ]
        const dataTotal = await this.orm.searchCount("account.move", domainTotal)
        this.state.inv.total = dataTotal
    }
    async getWaitingINV(){
        let domainWaiting = [
            ['status', '=', 'todo'],
            ['res_model', '=', 'account.move'],
            ['state', 'in', ['today','planned']],
        ]
        const dataWaits = await this.orm.searchCount("mail.activity", domainWaiting)
        this.state.inv.waits = dataWaits
    }
    async getUploadedINV(){
        let domainUploaded = [
            ['status', '=', 'to_approve'],
            ['res_model', '=', 'account.move'],
            ['state', 'in', ['today','planned']],
        ]
        const dataUploaded = await this.orm.searchCount("mail.activity", domainUploaded)
        this.state.inv.uploaded = dataUploaded
    }
    async getLateINV(){
        let domainLate = [
            ['res_model', '=', 'account.move'],
            ['state', '=', 'overdue']
        ]
        const dataLate = await this.orm.searchCount("mail.activity", domainLate)
        this.state.inv.late = dataLate
    }
    // ======================

    // === PR COUNTERS ===
    async getTotalPR(){
        let domainTotal = [
            ['state', 'in', ['draft','upload','request','approve']],
        ]
        const dataTotal = await this.orm.searchCount("wika.payment.request", domainTotal)
        this.state.pr.total = dataTotal
    }
    async getWaitingPR(){
        let domainWaiting = [
            ['status', '=', 'todo'],
            ['res_model', '=', 'wika.payment.request'],
            ['state', 'in', ['today','planned']],
        ]
        const dataWaits = await this.orm.searchCount("mail.activity", domainWaiting)
        this.state.pr.waits = dataWaits
    }
    async getUploadedPR(){
        let domainUploaded = [
            ['status', '=', 'to_approve'],
            ['res_model', '=', 'wika.payment.request'],
            ['state', 'in', ['today','planned']],
        ]
        const dataUploaded = await this.orm.searchCount("mail.activity", domainUploaded)
        this.state.pr.uploaded = dataUploaded
    }
    async getLatePR(){
        let domainLate = [
            ['res_model', '=', 'wika.payment.request'],
            ['state', '=', 'overdue']
        ]
        const dataLate = await this.orm.searchCount("mail.activity", domainLate)
        this.state.pr.late = dataLate
    }
    // ======================


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


    // === PO URL BUILDERS ===
    async getPoUrlWait(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Purchase Orders to Upload'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Purchase Orders to Upload',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'todo'), ('res_model', '=', 'purchase.order'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.po.url.wait = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.po.url.wait = url
        }
    }
    async getPoUrlUpload(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Purchase Orders to Approve'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Purchase Orders to Approve',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'to_approve'), ('res_model', '=', 'purchase.order'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.po.url.upload = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.po.url.upload = url
        }
    }
    async getPoUrlLate(){
        // let today = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name', '=', 'Late Purchase Orders Approval'], ['domain', '=', "[('res_model', '=', 'purchase.order'), ('state', '=', 'overdue')]"]]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Late Purchase Orders Approval',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('res_model', '=', 'purchase.order'), ('state', '=', 'overdue')]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.po.url.late = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.po.url.late = url
        }
    }
    // === PO URL BUILDERS ===
    
    // === GRSES URL BUILDERS ===
    async getGrsesUrlWait(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','GR/SES to Upload'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'GR/SES to Upload',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'todo'), ('res_model', '=', 'stock.picking'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.grses.url.wait = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.grses.url.wait = url
        }
    }
    async getGrsesUrlUpload(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','GR/SES to Approve'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'GR/SES to Approve',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'to_approve'), ('res_model', '=', 'stock.picking'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.grses.url.upload = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.grses.url.upload = url
        }
    }
    async getGrsesUrlLate(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name', '=', 'Late GR/SES Approval'], ['domain', '=', "[('res_model', '=', 'stock.picking'), ('state', '=', 'overdue')]"]]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Late GR/SES Approval',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('res_model', '=', 'stock.picking'), ('state', '=', 'overdue')]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.grses.url.late = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.grses.url.late = url
        }
    }
    // === GRSES URL BUILDERS ===

    // === BAP URL BUILDERS ===
    async getBapUrlWait(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Berita Acara Pembayaran to Upload'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Berita Acara Pembayaran to Upload',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'todo'), ('res_model', '=', 'wika.berita.acara.pembayaran'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.bap.url.wait = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.bap.url.wait = url
        }
    }
    async getBapUrlUpload(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Berita Acara Pembayaran to Approve'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Berita Acara Pembayaran to Approve',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'to_approve'), ('res_model', '=', 'wika.berita.acara.pembayaran'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.bap.url.upload = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.bap.url.upload = url
        }
    }
    async getBapUrlLate(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name', '=', 'Late Berita Acara Pembayaran Approval'], ['domain', '=', "[('res_model', '=', 'wika.berita.acara.pembayaran'), ('state', '=', 'overdue')]"]]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Late Berita Acara Pembayaran Approval',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('res_model', '=', 'wika.berita.acara.pembayaran'), ('state', '=', 'overdue')]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.bap.url.late = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.bap.url.late = url
        }
    }
    // === BAP URL BUILDERS ===

    // === INV URL BUILDERS ===
    async getInvUrlWait(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Invoice to Upload'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Invoice to Upload',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'todo'), ('res_model', '=', 'account.move'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.inv.url.wait = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.inv.url.wait = url
        }
    }
    async getInvUrlUpload(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Invoice to Approve'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Invoice to Approve',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'to_approve'), ('res_model', '=', 'account.move'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.inv.url.upload = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.inv.url.upload = url
        }
    }
    async getInvUrlLate(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name', '=', 'Late Invoice Approval'], ['domain', '=', "[('res_model', '=', 'account.move'), ('state', '=', 'overdue')]"]]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Late Invoice Approval',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('res_model', '=', 'account.move'), ('state', '=', 'overdue')]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.inv.url.late = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.inv.url.late = url
        }
    }
    // === INV URL BUILDERS ===

    // === PR URL BUILDERS ===
    async getPrUrlWait(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Pengajuan Pembayaran to Upload'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Pengajuan Pembayaran to Upload',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'todo'), ('res_model', '=', 'wika.payment.request'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.pr.url.wait = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.pr.url.wait = url
        }
    }
    async getPrUrlUpload(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name','=','Pengajuan Pembayaran to Approve'], ['view_mode', '=', 'tree']]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Pengajuan Pembayaran to Approve',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('status', '=', 'to_approve'), ('res_model', '=', 'wika.payment.request'), ('state', 'in', ['today', 'planned'])]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.pr.url.upload = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.pr.url.upload = url
        }
    }
    async getPrUrlLate(){
        let domainView = [['name', '=', 'mail.activity.todo.view.tree'], ['model', '=', 'mail.activity']]
        let domainMenu = [['name', '=', 'Dashboard'], ['web_icon', 'ilike', 'wika_dashboard']]
        let domainAction = [['name', '=', 'Late Pengajuan Pembayaran Approval'], ['domain', '=', "[('res_model', '=', 'wika.payment.request'), ('state', '=', 'overdue')]"]]
        const viewId = await this.orm.search("ir.ui.view", domainView)
        const existingAction = await this.orm.search("ir.actions.act_window", domainAction)
        const menuId = await this.orm.search("ir.ui.menu", domainMenu)

        if (existingAction[0] === 0 || existingAction.length === 0) {
            const actionId = await this.orm.create('ir.actions.act_window', [{
                name: 'Late Pengajuan Pembayaran Approval',
                res_model: 'mail.activity',
                view_mode: 'tree',
                view_id: viewId[0],
                domain: "[('res_model', '=', 'wika.payment.request'), ('state', '=', 'overdue')]"
            }])
            let url = `/web#model=mail.activity&view_type=list&action=${actionId}&menu_id=${menuId}`
            this.state.pr.url.late = url
        } else {
            let url = `/web#model=mail.activity&view_type=list&action=${existingAction}&menu_id=${menuId}`
            this.state.pr.url.late = url
        }
    }
    // === PR URL BUILDERS ===



    async viewQuotations(){
        let domain = [['state', 'in', ['sent', 'draft']]]
        if (this.state.period > 0){
            domain.push(['date_order','>', this.state.current_date])
        }

        let list_view = await this.orm.searchRead("ir.model.data", [['name', '=', 'view_quotation_tree_with_onboarding']], ['res_id'])

        this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Quotations",
            res_model: "sale.order",
            domain,
            views: [
                [list_view.length > 0 ? list_view[0].res_id : false, "list"],
                [false, "form"],
            ]
        })
    }

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