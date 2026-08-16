"use client";

import { useEffect, useRef, useState } from "react";
import { Search, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

export function PaymentModal({
	open,
	onOpenChange,
	totalAmount,
	onConfirm,
}: any) {
	const [customerName, setCustomerName] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	const [shopName, setShopName] = useState("");
	const [address, setAddress] = useState("");
	const [customerId, setCustomerId] = useState<number | null>(null);
	const [customerCode, setCustomerCode] = useState("");

	// Autocomplete state
	const [searchQuery, setSearchQuery] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedFromDB, setSelectedFromDB] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Fetch all customers
	const { data: allCustomers } = trpc.customers.list.useQuery(undefined, {
		enabled: open,
		staleTime: 30_000,
	});

	// Filter customers based on search query
	const suggestions = searchQuery.trim().length >= 1
		? (allCustomers ?? []).filter((c) => {
			const q = searchQuery.toLowerCase();
			return (
				c.name?.toLowerCase().includes(q) ||
				c.phone?.includes(q) ||
				c.customer_code?.toLowerCase().includes(q)
			);
		}).slice(0, 8)
		: [];

	// Reset when modal opens
	useEffect(() => {
		if (open) {
			setCustomerName("");
			setCustomerPhone("");
			setShopName("");
			setAddress("");
			setCustomerId(null);
			setCustomerCode("");
			setSearchQuery("");
			setSelectedFromDB(false);
			setShowSuggestions(false);
		}
	}, [open]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setShowSuggestions(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const handleSelectCustomer = (customer: any) => {
		setCustomerName(customer.name ?? "");
		setCustomerPhone(customer.phone ?? "");
		setShopName(""); // customers table doesn't have shop name separately
		setAddress(customer.address ?? "");
		setCustomerId(customer.id);
		setCustomerCode(customer.customer_code ?? "");
		setSearchQuery(customer.name ?? "");
		setSelectedFromDB(true);
		setShowSuggestions(false);
	};

	const handleClearCustomer = () => {
		setCustomerName("");
		setCustomerPhone("");
		setShopName("");
		setAddress("");
		setCustomerId(null);
		setCustomerCode("");
		setSearchQuery("");
		setSelectedFromDB(false);
	};

	const handleConfirm = () => {
		const payments = [{ methodId: 1, amount: totalAmount.toString() }];
		onConfirm(payments, {
			customerId: customerId ?? undefined,
			customerName: customerName.trim() || undefined,
			customerPhone: customerPhone.trim() || undefined,
			shopName: shopName.trim() || undefined,
			address: address.trim() || undefined,
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle className="text-2xl">Complete Payment</DialogTitle>
				</DialogHeader>

				<div className="grid gap-6 py-4">
					{/* Total Due */}
					<div className="flex items-center justify-between rounded-lg bg-muted p-4">
						<span className="font-medium text-xl">Total Due</span>
						<span className="font-bold text-3xl">₹{totalAmount.toFixed(2)}</span>
					</div>

					{/* Customer Details */}
					<div className="space-y-4">
						<Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
							Customer Details <span className="text-xs font-normal normal-case">(optional)</span>
						</Label>

						{/* Customer Search Autocomplete */}
						<div className="space-y-1.5" ref={dropdownRef}>
							<Label htmlFor="customerSearch">Search Customer</Label>
							<div className="relative">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
								<Input
									id="customerSearch"
									placeholder="Search by name or phone..."
									value={searchQuery}
									autoComplete="off"
									className="pl-9 pr-8"
									onChange={(e) => {
										setSearchQuery(e.target.value);
										setSelectedFromDB(false);
										setCustomerId(null);
										setCustomerName(e.target.value);
										setCustomerPhone("");
										setShowSuggestions(true);
									}}
									onFocus={() => {
										if (searchQuery.trim()) setShowSuggestions(true);
									}}
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={handleClearCustomer}
										className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
									>
										<X className="h-4 w-4" />
									</button>
								)}

								{/* Suggestions Dropdown */}
								{showSuggestions && suggestions.length > 0 && (
									<div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
										{suggestions.map((customer) => (
											<button
												key={customer.id}
												type="button"
												className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
												onClick={() => handleSelectCustomer(customer)}
											>
												<div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
													<User className="h-4 w-4 text-primary" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2">
														<span className="font-semibold text-sm truncate">{customer.name}</span>
														{customer.customer_code && (
															<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
																{customer.customer_code}
															</span>
														)}
													</div>
													<div className="text-xs text-muted-foreground">
														{customer.phone && <span>📞 {customer.phone}</span>}
														{customer.email && <span className="ml-2 truncate">• {customer.email}</span>}
													</div>
												</div>
											</button>
										))}
									</div>
								)}

								{showSuggestions && searchQuery.trim().length >= 1 && suggestions.length === 0 && (
									<div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-3 text-sm text-muted-foreground shadow-lg">
										No customer found — will be saved as walk-in.
									</div>
								)}
							</div>

							{/* Selected customer pill */}
							{selectedFromDB && customerId && (
								<div className="flex flex-col gap-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
									<div className="flex items-center gap-2">
										<User className="h-3.5 w-3.5 text-primary shrink-0" />
										<span className="font-medium text-primary">{customerName}</span>
										{customerCode && (
											<span className="rounded bg-primary/10 px-1.5 font-mono text-[10px] text-primary">
												{customerCode}
											</span>
										)}
										{customerPhone && (
											<span className="text-muted-foreground text-xs ml-auto">📞 {customerPhone}</span>
										)}
									</div>
									{address && (
										<div className="text-xs text-muted-foreground mt-0.5 border-t border-primary/10 pt-1">
											📍 {address}
										</div>
									)}
								</div>
							)}
						</div>

						{/* Manual fields — shown when NOT selected from DB */}
						{!selectedFromDB && (
							<div className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="customerPhone">Phone Number</Label>
									<Input
										id="customerPhone"
										placeholder="e.g. 9876543210"
										type="tel"
										maxLength={10}
										value={customerPhone}
										onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="shopName">Shop / Firm Name</Label>
									<Input
										id="shopName"
										placeholder="e.g. Sharma General Store"
										value={shopName}
										onChange={(e) => setShopName(e.target.value)}
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="customerAddress">Address</Label>
									<Input
										id="customerAddress"
										placeholder="e.g. Near Bus Stand, Main Market"
										value={address}
										onChange={(e) => setAddress(e.target.value)}
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-end gap-3">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="lg" onClick={handleConfirm}>
						Confirm &amp; Print
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
