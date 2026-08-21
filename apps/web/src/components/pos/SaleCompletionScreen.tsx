"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowLeftRight,
	CheckCircle2,
	Copy,
	Download,
	FileText,
	Mail,
	MessageCircle,
	Printer,
	Receipt,
	RotateCcw,
	ShoppingBag,
	Store,
	X,
	XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompletedOrder {
	id: number;
	createdAt: string;
	items: Array<{
		id: number;
		name: string;
		qty: number;
		price: string;
	}>;
	total: number;
	subtotal: number;
	discount: number;
	payments: Array<{ methodId: number; amount: string }>;
	cashierName?: string;
	customerName?: string;
	customerPhone?: string;
	shopName?: string;
	address?: string;
	couponCode?: string;
}

interface SaleCompletionScreenProps {
	order: CompletedOrder;
	onNewSale: () => void;
}

const STORE = {
	name: "EVALUNA PVT LTD",
	address: "Near Bank of India, Vidisha Road, Berasia",
	city: "Bhopal, MP – 463106",
	phone: "7000219747",
};

const PAYMENT_METHOD_LABELS: Record<number, string> = {
	1: "Cash",
	2: "Card",
	3: "UPI",
	4: "Store Credit",
};

function numberToWords(num: number): string {
	const a = [
		"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
		"Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
	];
	const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

	if (num === 0) return "Zero";

	const g = (n: number): string => {
		if (n < 20) return a[n];
		const digit = n % 10;
		return b[Math.floor(n / 10)] + (digit ? "-" + a[digit] : "");
	};

	const h = (n: number): string => {
		if (n >= 100) {
			return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + g(n % 100) : "");
		}
		return g(n);
	};

	let str = "";
	let temp = Math.floor(num);
	
	if (temp >= 100000) {
		str += h(Math.floor(temp / 100000)) + " Lakh ";
		temp %= 100000;
	}
	if (temp >= 1000) {
		str += h(Math.floor(temp / 1000)) + " Thousand ";
		temp %= 1000;
	}
	if (temp > 0) {
		str += h(temp);
	}
	return str.trim() + " Rupees Only";
}

const getPaymentStatusBadge = (order: CompletedOrder) => {
	const paid = order.payments.reduce(
		(a, p) => a + Number.parseFloat(p.amount),
		0,
	);
	if (paid >= order.total - 0.01)
		return {
			label: "PAID",
			color: "bg-green-100 text-green-700 border-green-300",
		};
	if (paid > 0)
		return {
			label: "PARTIAL",
			color: "bg-yellow-100 text-yellow-700 border-yellow-300",
		};
	return { label: "UNPAID", color: "bg-red-100 text-red-700 border-red-300" };
};

export function SaleCompletionScreen({
	order,
	onNewSale,
}: SaleCompletionScreenProps) {
	const receiptRef = useRef<HTMLDivElement>(null);
	const [pageSize, setPageSize] = useState<"80mm" | "A4">("80mm");

	const totalPaid = order.payments.reduce(
		(a, p) => a + Number.parseFloat(p.amount),
		0,
	);
	const change = Math.max(0, totalPaid - order.total);
	const balanceDue = Math.max(0, order.total - totalPaid);
	const roundOff = Math.round(order.total) - order.total;
	const grandTotal = Math.round(order.total);
	const status = getPaymentStatusBadge(order);

	const formattedDate = new Date(order.createdAt).toLocaleString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const handlePrint = () => {
		const printContent = document.getElementById("printable-receipt");
		if (!printContent) return;

		const printWindow = window.open("", "_blank", "width=800,height=900");
		if (!printWindow) {
			toast.error("Popup blocker prevented printing. Please allow popups.");
			return;
		}

		// Inject only target content and style rules
		const pageSizeStyle = pageSize === "80mm"
			? `
				@page { size: 80mm auto; margin: 0; }
				body { width: 80mm; margin: 0; padding: 4px; font-family: sans-serif; font-size: 11px; color: #000; }
				#printable-receipt { width: 80mm; margin: 0; padding: 0; }
			`
			: `
				@page { size: A4 portrait; margin: 20mm; }
				body { width: 100%; margin: 0; padding: 0; font-family: sans-serif; font-size: 13px; color: #000; }
				#printable-receipt { width: 100%; margin: 0; padding: 0; }
			`;

		printWindow.document.write(`
			<html>
				<head>
					<title>Invoice #${order.id}</title>
					<style>
						${pageSizeStyle}
						hr { border: none; border-top: 1px dashed #000; margin: 12px 0; }
						table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
						th { border-bottom: 1px dashed #000; padding: 6px 2px; font-size: 11px; text-transform: uppercase; }
						td { padding: 4px 2px; vertical-align: top; }
						.text-right { text-align: right; }
						.text-center { text-align: center; }
						.font-bold { font-weight: bold; }
						.text-gray-500 { color: #666; }
						.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
						.mb-4 { margin-bottom: 16px; }
						.text-xl { font-size: 18px; }
						.text-xs { font-size: 10px; }
					</style>
				</head>
				<body>
					<div>
						${printContent.innerHTML}
					</div>
					<script>
						window.onload = function() {
							setTimeout(function() {
								window.print();
								window.close();
							}, 200);
						};
					</script>
				</body>
			</html>
		`);
		printWindow.document.close();
	};

	const handleDownloadPDF = async () => {
		const toastId = toast.loading("Generating vector PDF...");
		try {
			// Dynamically import @react-pdf/renderer to avoid SSR issues
			const { pdf, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");

			// Register a font that supports Devanagari (Hindi) and basic Latin
			// Loaded locally from our public/fonts folder to avoid 404/network errors
			Font.register({
				family: "NotoSansDevanagari",
				src: `${window.location.origin}/fonts/NotoSansDevanagari-Regular.ttf`
			});

			const isA4 = pageSize === "A4";
			const calculatedHeight = pageSize === "80mm"
				? Math.max(140, 110 + order.items.length * 12 + (order.customerName ? 20 : 0) + order.payments.length * 5)
				: 297; // A4 height is 297mm

			const styles = StyleSheet.create({
				page: {
					fontFamily: "NotoSansDevanagari",
					padding: isA4 ? 40 : 10,
					fontSize: isA4 ? 12 : 9,
					backgroundColor: "#ffffff",
				},
				header: {
					textAlign: "center",
					marginBottom: 10,
				},
				title: {
					fontSize: isA4 ? 16 : 12,
					fontWeight: "bold",
					marginBottom: 4,
				},
				subtitle: {
					fontSize: isA4 ? 10 : 8,
					marginBottom: 2,
				},
				separator: {
					borderBottomWidth: 1,
					borderBottomStyle: "dashed",
					borderBottomColor: "#000",
					marginVertical: 6,
				},
				row: {
					flexDirection: "row",
					justifyContent: "space-between",
					marginBottom: 4,
				},
				bold: {
					fontWeight: "bold",
				},
				tableHeader: {
					flexDirection: "row",
					borderBottomWidth: 1,
					borderBottomStyle: "dashed",
					borderBottomColor: "#000",
					paddingBottom: 4,
					marginBottom: 4,
				},
				tableRow: {
					flexDirection: "row",
					marginBottom: 4,
				},
				colItem: { flex: isA4 ? 4 : 3 },
				colQty: { flex: 1, textAlign: "right" },
				colRate: { flex: 2, textAlign: "right" },
				colTotal: { flex: 2, textAlign: "right" },
				footer: {
					textAlign: "center",
					marginTop: 10,
					fontSize: isA4 ? 10 : 7.5,
				}
			});

			const InvoiceDocument = () => (
				<Document>
					<Page 
						size={pageSize === "80mm" ? [226.77, calculatedHeight * 2.834] : "A4"} 
						style={styles.page}
					>
						{/* Header */}
						<View style={styles.header}>
							<Text style={styles.title}>{STORE.name}</Text>
							<Text style={styles.subtitle}>{STORE.address}</Text>
							<Text style={styles.subtitle}>{STORE.city}</Text>
							<Text style={styles.subtitle}>Phone: {STORE.phone}</Text>
						</View>

						<View style={styles.separator} />

						{/* Invoice Meta */}
						<View style={styles.row}>
							<Text>Invoice No:</Text>
							<Text>#{order.id}</Text>
						</View>
						<View style={styles.row}>
							<Text>Date & Time:</Text>
							<Text>{formattedDate}</Text>
						</View>
						<View style={styles.row}>
							<Text>Cashier:</Text>
							<Text>{order.cashierName || "Counter 1"}</Text>
						</View>

						{/* Customer Details */}
						{(order.customerName || order.customerPhone || order.shopName) && (
							<>
								<View style={styles.separator} />
								<Text style={[styles.bold, { marginBottom: 4 }]}>BILL TO:</Text>
								{order.customerName && (
									<View style={styles.row}>
										<Text>Name:</Text>
										<Text>{order.customerName}</Text>
									</View>
								)}
								{order.shopName && (
									<View style={styles.row}>
										<Text>Shop:</Text>
										<Text>{order.shopName}</Text>
									</View>
								)}
								{order.customerPhone && (
									<View style={styles.row}>
										<Text>Phone:</Text>
										<Text>{order.customerPhone}</Text>
									</View>
								)}
								{order.address && (
									<View style={styles.row}>
										<Text>Address:</Text>
										<Text>{order.address}</Text>
									</View>
								)}
							</>
						)}

						<View style={styles.separator} />

						{/* Table Header */}
						<View style={styles.tableHeader}>
							<Text style={[styles.colItem, styles.bold]}>Item</Text>
							<Text style={[styles.colQty, styles.bold]}>Qty</Text>
							<Text style={[styles.colRate, styles.bold]}>Rate</Text>
							<Text style={[styles.colTotal, styles.bold]}>Total</Text>
						</View>

						{/* Table Items */}
						{order.items.map((item, idx) => {
							const rate = Number.parseFloat(item.price);
							const lineTotal = rate * item.qty;
							const qtyStr = Number.isInteger(item.qty) ? item.qty.toString() : item.qty.toFixed(3);
							return (
								<View key={idx} style={styles.tableRow}>
									<Text style={styles.colItem}>{item.name}</Text>
									<Text style={styles.colQty}>{qtyStr}</Text>
									<Text style={styles.colRate}>Rs.{rate.toFixed(2)}</Text>
									<Text style={styles.colTotal}>Rs.{lineTotal.toFixed(2)}</Text>
								</View>
							);
						})}

						<View style={styles.separator} />

						{/* Summary */}
						<View style={styles.row}>
							<Text>Subtotal:</Text>
							<Text>Rs.{order.subtotal.toFixed(2)}</Text>
						</View>
						{order.discount > 0 && (
							<View style={styles.row}>
								<Text>Discount:</Text>
								<Text>-Rs.{order.discount.toFixed(2)}</Text>
							</View>
						)}
						{roundOff !== 0 && (
							<View style={styles.row}>
								<Text>Round-off:</Text>
								<Text>{roundOff > 0 ? "+" : ""}Rs.{roundOff.toFixed(2)}</Text>
							</View>
						)}

						<View style={styles.separator} />
						<View style={styles.row}>
							<Text style={[styles.bold, { fontSize: isA4 ? 14 : 11 }]}>Grand Total:</Text>
							<Text style={[styles.bold, { fontSize: isA4 ? 14 : 11 }]}>Rs.{grandTotal.toFixed(2)}</Text>
						</View>
						<View style={styles.separator} />

						{/* Footer */}
						<View style={styles.footer}>
							<Text style={[styles.bold, { marginBottom: 2, fontSize: isA4 ? 12 : 9 }]}>Thank you for shopping!</Text>
							<Text>Goods once sold will not be taken back</Text>
							<Text>without valid receipt within 7 days</Text>
						</View>
					</Page>
				</Document>
			);

			const blob = await pdf(<InvoiceDocument />).toBlob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `invoice_${order.id}_${pageSize}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast.success("Vector PDF downloaded successfully!", { id: toastId });
		} catch (err: any) {
			console.error("PDF generation error:", err);
			toast.error(`Failed: ${err?.message || "Error"}. Try 'Print Receipt' -> 'Save as PDF'`, { id: toastId });
		}
	};

	const handleWhatsApp = () => {
		let itemsText = "";
		order.items.forEach((item, idx) => {
			const rate = Number.parseFloat(item.price);
			const lineTotal = rate * item.qty;
			const qtyStr = Number.isInteger(item.qty)
				? item.qty
				: item.qty.toFixed(3);
			itemsText += `${idx + 1}. *${item.name}*\n   Qty: ${qtyStr} x ₹${rate.toFixed(2)} = *₹${lineTotal.toFixed(2)}*\n`;
		});

		let customerText = "";
		if (order.customerName || order.customerPhone || order.shopName) {
			customerText += `--------------------------------\n*BILL TO:*\n`;
			if (order.customerName) customerText += `• Name: ${order.customerName}\n`;
			if (order.shopName) customerText += `• Shop: ${order.shopName}\n`;
			if (order.customerPhone) customerText += `• Phone: ${order.customerPhone}\n`;
			if (order.address) customerText += `• Address: ${order.address}\n`;
		}

		const fullText = `🧾 *INVOICE #${order.id}*\n*${STORE.name}*\n_${STORE.address}, ${STORE.city}_\n📞 Phone: ${STORE.phone}\n--------------------------------\n*Date:* ${formattedDate}\n*Cashier:* ${order.cashierName || "Counter 1"}\n${customerText}--------------------------------\n*ITEMS:*\n${itemsText}--------------------------------\n*Subtotal:* ₹${order.subtotal.toFixed(2)}\n*Grand Total:* *₹${grandTotal.toFixed(2)}*\n*Payment:* ${order.payments.map((p) => `${PAYMENT_METHOD_LABELS[p.methodId] ?? "Payment"}: ₹${Number.parseFloat(p.amount).toFixed(2)}`).join(", ")}\n--------------------------------\nThank you for shopping!\n_*EVALUNA PVT LTD*_`;

		window.open(
			`https://wa.me/?text=${encodeURIComponent(fullText)}`,
			"_blank",
		);
	};

	const handleEmail = () => {
		const subject = encodeURIComponent(`Invoice #${order.id} - ${STORE.name}`);
		const body = encodeURIComponent(
			`Dear Customer,\n\nYour invoice #${order.id} has been generated.\nTotal: ₹${order.total.toFixed(2)}\nDate: ${formattedDate}\n\nThank you for shopping at ${STORE.name}!`,
		);
		window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
	};

	const handleDuplicate = () => {
		toast.info("Duplicate invoice feature requires manager permission.");
	};

	const handleReturn = () => {
		toast.info(
			"Return items: Please go to Invoice History → Select this invoice → Return.",
		);
	};

	const handleExchange = () => {
		toast.info(
			"Exchange items: Please go to Invoice History → Select this invoice → Exchange.",
		);
	};

	const handleCancel = () => {
		toast.warning("Cancel Invoice: Requires manager PIN. Feature coming soon.");
	};

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
			>
				{/* Global style overrides for printing */}
				<style dangerouslySetInnerHTML={{ __html: `
					@media print {
						body {
							background: #ffffff !important;
							overflow: visible !important;
						}
						.print\\:hidden {
							display: none !important;
						}
						#printable-receipt {
							display: block !important;
							margin: 0 auto !important;
							padding: 0 !important;
							border: none !important;
							box-shadow: none !important;
							width: ${pageSize === "A4" ? "210mm" : "80mm"} !important;
							${pageSize === "80mm" ? `
								font-family: 'Courier New', Courier, monospace !important;
								text-align: left !important;
								color: #000000 !important;
							` : ""}
						}
						${pageSize === "80mm" ? `
							#printable-receipt * {
								font-family: 'Courier New', Courier, monospace !important;
								color: #000000 !important;
							}
							#printable-receipt .text-left { text-align: left !important; }
							#printable-receipt .text-center { text-align: center !important; }
							#printable-receipt .text-right { text-align: right !important; }
							#printable-receipt .border-dashed, 
							#printable-receipt tr.border-b.border-dashed, 
							#printable-receipt div.border-t.border-dashed {
								border-style: dashed !important;
								border-color: #000000 !important;
								border-width: 0 0 1px 0 !important;
								display: block;
								width: 100%;
							}
							#printable-receipt table tr.border-b.border-dashed {
								display: table-row !important;
							}
						` : ""}
						* {
							-webkit-print-color-adjust: exact !important;
							print-color-adjust: exact !important;
						}
						tr, .summary-block, .footer-block {
							page-break-inside: avoid;
						}
						@page {
							margin: ${pageSize === "A4" ? "5mm" : "0"};
							size: ${pageSize === "A4" ? "A4 portrait" : "80mm auto"};
						}
					}
				`}} />

				<motion.div
					initial={{ scale: 0.92, opacity: 0, y: 20 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.92, opacity: 0 }}
					transition={{ type: "spring", damping: 22, stiffness: 300 }}
					className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
				>
					{/* ── Screen Control Bar (Hidden on Print) ── */}
					<div className="flex shrink-0 flex-col sm:flex-row gap-4 items-center justify-between bg-blue-900 px-6 py-4 text-white print:hidden">
						<div className="flex items-center gap-3 w-full sm:w-auto">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-800 text-white shadow-inner">
								<Receipt className="h-5 w-5 text-blue-200" />
							</div>
							<div>
								<div className="font-black text-base tracking-tight leading-none">
									Billing Checkout
								</div>
								<div className="text-blue-300 text-xs mt-1">
									Invoice #{order.id} generated
								</div>
							</div>
						</div>

						{/* Format Selector Tabs */}
						<div className="flex rounded-lg bg-blue-950/80 p-0.5 border border-blue-800 w-full sm:w-auto justify-center">
							<button
								type="button"
								onClick={() => setPageSize("A4")}
								className={`flex-1 sm:flex-none rounded-md px-4 py-1.5 text-xs font-bold transition-all cursor-pointer text-center ${
									pageSize === "A4"
										? "bg-blue-800 text-white shadow-sm"
										: "text-blue-300 hover:text-white"
								}`}
							>
								A4 Sheet
							</button>
							<button
								type="button"
								onClick={() => setPageSize("80mm")}
								className={`flex-1 sm:flex-none rounded-md px-4 py-1.5 text-xs font-bold transition-all cursor-pointer text-center ${
									pageSize === "80mm"
										? "bg-blue-800 text-white shadow-sm"
										: "text-blue-300 hover:text-white"
								}`}
							>
								80mm Thermal
							</button>
						</div>

						{/* Top Actions */}
						<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
							<Button
								variant="ghost"
								size="sm"
								className="text-white hover:bg-blue-800 gap-1.5"
								onClick={handlePrint}
							>
								<Printer className="h-4 w-4" />
								Print
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="text-white hover:bg-blue-800 gap-1.5"
								onClick={handleDownloadPDF}
							>
								<Download className="h-4 w-4" />
								PDF
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-blue-200 hover:text-white hover:bg-blue-800"
								onClick={onNewSale}
							>
								<X className="h-5 w-5" />
							</Button>
						</div>
					</div>

					<div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden">
						{/* ── Center-Aligned Interactive Preview Canvas ── */}
						<div className="flex min-h-0 flex-1 bg-slate-100 overflow-auto p-6 print:p-0 print:bg-white">
							<div className="m-auto flex min-h-full min-w-max items-center justify-center print:m-0 print:block">
								<motion.div
									id="printable-receipt"
									ref={receiptRef}
									layout
									animate={{
										width: pageSize === "A4" ? "210mm" : "80mm",
									}}
										transition={{ type: "spring", stiffness: 300, damping: 30 }}
										className={`paper-sheet bg-white shadow-xl border border-slate-200 print:shadow-none print:border-none mx-auto ${
											pageSize === "A4"
												? "p-[20mm] text-sm text-slate-800"
												: "p-4 font-mono text-[11px] leading-tight text-black"
										}`}
										style={{ color: "#000" }}
									>
										{pageSize === "A4" ? (
											<div className="w-full text-left">
												{/* Top Accent Bar */}
												<div className="h-2 w-full bg-blue-800 -mt-[20mm] -mx-[20mm] mb-8" style={{ width: "calc(100% + 40mm)" }} />
												
												{/* Header */}
												<div className="flex justify-between items-start mb-6">
													<div className="flex items-center gap-3">
														<div className="h-12 w-12 bg-blue-800 rounded-lg flex items-center justify-center text-white shrink-0">
															<Store className="h-7 w-7" />
														</div>
														<div>
															<h1 className="text-2xl font-black text-blue-900 tracking-tight">{STORE.name}</h1>
															<p className="text-slate-500 text-xs mt-0.5">{STORE.address}</p>
															<p className="text-slate-500 text-xs">{STORE.city}</p>
														</div>
													</div>
													<div className="text-right">
														<div className="text-[10px] font-bold text-blue-800 tracking-widest uppercase mb-1">Bill Invoice</div>
														<h2 className="text-xl font-black text-slate-900">#{order.id}</h2>
														<p className="text-slate-500 text-xs mt-1">{formattedDate}</p>
														<p className="text-slate-400 text-[10px] mt-0.5">Cashier: {order.cashierName || "Counter 1"}</p>
													</div>
												</div>

												{/* Meta & Status Card */}
												<div className="flex w-full gap-4 mb-6">
													<div className="w-2/3 bg-blue-50/50 print:bg-transparent border border-blue-100 print:border-slate-300 rounded-xl p-4">
														<div className="text-xs font-bold text-blue-900 print:text-black uppercase tracking-wider mb-2">Customer Details</div>
														{order.customerName || order.customerPhone || order.shopName ? (
															<div className="space-y-1 text-xs text-slate-700 print:text-black">
																{order.customerName && <div className="font-semibold text-slate-900 print:text-black">{order.customerName}</div>}
																{order.shopName && <div><span className="text-slate-400 print:text-slate-600">Shop:</span> {order.shopName}</div>}
																{order.customerPhone && <div><span className="text-slate-400 print:text-slate-600">Phone:</span> {order.customerPhone}</div>}
																{order.address && <div><span className="text-slate-400 print:text-slate-600">Address:</span> {order.address}</div>}
															</div>
														) : (
															<div className="text-xs text-slate-400 italic">Walk-in Customer</div>
														)}
													</div>
													<div className="w-1/3 bg-blue-50/50 print:bg-transparent border border-blue-100 print:border-slate-300 rounded-xl p-4 flex flex-col justify-between items-end">
														<span className="text-xs font-bold text-blue-900 print:text-black uppercase tracking-wider">Payment Status</span>
														<span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
															status.label === "PAID" 
																? "bg-green-50 text-green-700 border-green-200 print:border-black print:text-black" 
																: status.label === "PARTIAL"
																	? "bg-yellow-50 text-yellow-700 border-yellow-200 print:border-black print:text-black"
																	: "bg-red-50 text-red-700 border-red-200 print:border-black print:text-black"
														}`}>
															{status.label}
														</span>
													</div>
												</div>

												{/* Itemized Table */}
												<div className="border border-slate-200 print:border-black rounded-xl overflow-hidden mb-6">
													<table className="w-full text-xs border-collapse">
														<thead>
															<tr className="bg-blue-800 print:bg-transparent print:border-b print:border-black text-white print:text-black font-semibold text-left">
																<th className="py-2.5 px-4 w-12 text-center border-b border-transparent print:border-black">#</th>
																<th className="py-2.5 px-4 border-b border-transparent print:border-black">Item Description</th>
																<th className="py-2.5 px-4 w-24 border-b border-transparent print:border-black">SKU</th>
																<th className="py-2.5 px-4 w-20 text-center border-b border-transparent print:border-black">Qty</th>
																<th className="py-2.5 px-4 w-24 text-right border-b border-transparent print:border-black">Unit Price</th>
																<th className="py-2.5 px-4 w-20 text-right border-b border-transparent print:border-black">Discount</th>
																<th className="py-2.5 px-4 w-28 text-right border-b border-transparent print:border-black">Total</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-slate-100 print:divide-black/20">
															{order.items.map((item, idx) => {
																const rate = Number.parseFloat(item.price);
																const lineTotal = rate * item.qty;
																return (
																	<tr key={idx} className="even:bg-slate-50/50 print:even:bg-transparent hover:bg-slate-50/30 transition-colors">
																		<td className="py-2.5 px-4 text-center text-slate-400 print:text-slate-800 font-medium">{idx + 1}</td>
																		<td className="py-2.5 px-4 font-medium text-slate-800 print:text-black">{item.name}</td>
																		<td className="py-2.5 px-4 text-slate-500 print:text-slate-800 font-mono text-[10px]">SKU-{item.id}</td>
																		<td className="py-2.5 px-4 text-center font-semibold text-slate-700 print:text-black">
																			{Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(3)}
																		</td>
																		<td className="py-2.5 px-4 text-right text-slate-600 print:text-black">₹{rate.toFixed(2)}</td>
																		<td className="py-2.5 px-4 text-right text-green-600 print:text-black">-</td>
																		<td className="py-2.5 px-4 text-right font-semibold text-slate-900 print:text-black">₹{lineTotal.toFixed(2)}</td>
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>

												{/* Summary Flex */}
												<div className="flex w-full gap-6 mb-8 items-start">
													<div className="w-7/12 bg-slate-50 print:bg-transparent border border-slate-100 print:border-transparent rounded-xl p-4">
														<div className="text-[10px] font-bold text-slate-400 print:text-black uppercase tracking-wider mb-1">Amount in Words</div>
														<div className="text-xs font-semibold text-slate-700 print:text-black capitalize leading-relaxed">
															{numberToWords(grandTotal)}
														</div>
													</div>
													<div className="w-5/12 space-y-2 text-xs">
														<div className="flex justify-between text-slate-500 print:text-black">
															<span>Subtotal</span>
															<span>₹{order.subtotal.toFixed(2)}</span>
														</div>
														{order.discount > 0 && (
															<div className="flex justify-between text-green-600 print:text-black font-medium">
																<span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
																<span>− ₹{order.discount.toFixed(2)}</span>
															</div>
														)}
														{roundOff !== 0 && (
															<div className="flex justify-between text-slate-500 print:text-black">
																<span>Round-off</span>
																<span>{roundOff > 0 ? "+" : ""}₹{roundOff.toFixed(2)}</span>
															</div>
														)}
														<div className="h-px bg-slate-200 print:bg-black my-2" />
														<div className="flex justify-between font-black text-blue-900 print:text-black text-sm">
															<span>Grand Total</span>
															<span>₹{grandTotal.toFixed(2)}</span>
														</div>
													</div>
												</div>

												{/* Footer */}
												<div className="border-t border-slate-200 print:border-black pt-6 mt-12 flex justify-between items-end">
													<div className="space-y-1.5 text-[10px] text-slate-400">
														<div className="font-bold text-slate-500 uppercase tracking-wide">Terms & Conditions</div>
														<p>• Goods once sold will not be taken back without valid receipt within 7 days.</p>
														<p>• This is a computer generated invoice and requires no physical signature.</p>
													</div>
													<div className="text-right space-y-6">
														<div className="inline-block border-b border-slate-300 w-48 text-center pb-1 text-slate-500 text-xs font-medium italic">
															Authorized Signatory
														</div>
													</div>
												</div>
											</div>
										) : (
											<div className="w-full text-center font-mono text-[11px] leading-tight text-black max-w-[302px] mx-auto">
												{/* Centered Header */}
												<div className="space-y-1 mb-2">
													<h2 className="font-bold text-xs tracking-wide uppercase">{STORE.name}</h2>
													<p className="text-[10px]">{STORE.address}</p>
													<p className="text-[10px]">{STORE.city}</p>
													<p className="text-[10px]">PHONE: {STORE.phone}</p>
												</div>

												<div className="border-t border-dashed border-slate-900 my-2" />

												{/* Meta Info */}
												<div className="text-left space-y-0.5">
													<div>INVOICE: #{order.id}</div>
													<div>DATE: {formattedDate}</div>
													<div>CASHIER: {order.cashierName || "Counter 1"}</div>
													<div className="font-bold">STATUS: {status.label}</div>
												</div>

												{order.customerName && (
													<>
														<div className="border-t border-dashed border-slate-900 my-2" />
														<div className="text-left space-y-0.5">
															<div className="font-bold">BILL TO:</div>
															<div>NAME: {order.customerName}</div>
															{order.shopName && <div>SHOP: {order.shopName}</div>}
															{order.customerPhone && <div>PHONE: {order.customerPhone}</div>}
														</div>
													</>
												)}

												<div className="border-t border-dashed border-slate-900 my-2" />

												{/* 3-Column Table */}
												<table className="w-full text-[11px] text-left">
													<thead>
														<tr className="border-b border-dashed border-slate-900 font-bold">
															<th className="py-1">ITEM</th>
															<th className="py-1 text-center w-12">QTY</th>
															<th className="py-1 text-right w-16">TOTAL</th>
														</tr>
													</thead>
													<tbody>
														{order.items.map((item, idx) => {
															const rate = Number.parseFloat(item.price);
															const lineTotal = rate * item.qty;
															return (
																<tr key={idx} className="align-top border-b border-dashed border-slate-300 last:border-b-0">
																	<td className="py-2">
																		<div className="font-bold leading-tight">{item.name}</div>
																		<div className="text-[10px] text-slate-600 pl-1 mt-0.5">
																			{Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(3)} x Rs.{rate.toFixed(2)}
																		</div>
																	</td>
																	<td className="py-2 text-center align-middle">
																		{Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(3)}
																	</td>
																	<td className="py-2 text-right align-middle font-medium">
																		Rs.{lineTotal.toFixed(2)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>

												<div className="border-t border-dashed border-slate-900 my-2" />

												{/* Summary */}
												<div className="space-y-1 text-left">
													<div className="flex justify-between">
														<span>SUBTOTAL:</span>
														<span>Rs.{order.subtotal.toFixed(2)}</span>
													</div>
													{order.discount > 0 && (
														<div className="flex justify-between">
															<span>DISCOUNT:</span>
															<span>-Rs.{order.discount.toFixed(2)}</span>
														</div>
													)}
													{roundOff !== 0 && (
														<div className="flex justify-between">
															<span>ROUND-OFF:</span>
															<span>{roundOff > 0 ? "+" : ""}Rs.{roundOff.toFixed(2)}</span>
														</div>
													)}
													<div className="border-t border-dashed border-slate-900 my-1" />
													<div className="flex justify-between font-bold text-[11px]">
														<span>GRAND TOTAL:</span>
														<span>Rs.{grandTotal.toFixed(2)}</span>
													</div>
												</div>

												<div className="border-t border-dashed border-slate-900 my-2" />

												{/* Footer */}
												<div className="space-y-0.5">
													<p className="font-bold">THANK YOU FOR YOUR VISIT!</p>
													<p>Goods once sold will not be taken back</p>
													<p>without valid receipt within 7 days.</p>
												</div>
											</div>
										)}
									</motion.div>
								</div>
						</div>

						{/* ── Right Actions Panel ── */}
						<div className="flex w-full md:w-64 shrink-0 flex-col gap-3 bg-slate-50 p-4 border-t md:border-t-0 md:border-l border-slate-200 print:hidden overflow-y-auto">
							<div className="mb-1 font-bold text-slate-400 text-xs uppercase tracking-wider">
								Actions
							</div>

							<Button
								size="lg"
								className="h-12 w-full bg-blue-800 font-bold text-base text-white shadow-md hover:bg-blue-900"
								onClick={onNewSale}
							>
								<ShoppingBag className="mr-2 h-5 w-5" />
								New Sale
							</Button>

							<hr className="my-1 border-slate-200" />
							<div className="font-bold text-slate-400 text-xs uppercase tracking-wider">
								Print &amp; Share
							</div>

							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handlePrint}
							>
								<Printer className="h-4 w-4 text-blue-800" />
								Print Receipt
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handlePrint}
							>
								<RotateCcw className="h-4 w-4 text-blue-800" />
								Reprint
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handleDownloadPDF}
							>
								<Download className="h-4 w-4 text-blue-800" />
								Download PDF
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handleWhatsApp}
							>
								<MessageCircle className="h-4 w-4 text-green-600" />
								Send WhatsApp
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handleEmail}
							>
								<Mail className="h-4 w-4 text-blue-500" />
								Send Email
							</Button>

							<hr className="my-1 border-slate-200" />
							<div className="font-bold text-slate-400 text-xs uppercase tracking-wider">
								Invoice Actions
							</div>

							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handleDuplicate}
							>
								<Copy className="h-4 w-4 text-slate-500" />
								Duplicate Invoice
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handleReturn}
							>
								<ArrowLeftRight className="h-4 w-4 text-orange-500" />
								Return Items
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-xs font-semibold"
								onClick={handleExchange}
							>
								<ArrowLeftRight className="h-4 w-4 text-purple-500" />
								Exchange Items
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start gap-2 border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 hover:text-red-700"
								onClick={handleCancel}
							>
								<XCircle className="h-4 w-4" />
								Cancel Invoice
							</Button>
						</div>
					</div>

					{/* ── Bottom Info Bar ── */}
					<div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-slate-400 text-xs print:hidden">
						<span>
							Invoice #{order.id} • {formattedDate}
						</span>
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center gap-1">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
								Stock updated
							</span>
							<span className="inline-flex items-center gap-1">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
								Ledger recorded
							</span>
							<span className="inline-flex items-center gap-1">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
								Audit logged
							</span>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
