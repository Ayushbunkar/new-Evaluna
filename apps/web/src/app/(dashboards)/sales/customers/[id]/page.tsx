"use client";

import { format } from "date-fns";
import {
	ArrowLeft,
	Gift,
	Mail,
	MapPin,
	Phone,
	ShieldCheck,
	Trash2,
	Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";

export default function CustomerProfilePage() {
	const { id } = useParams();
	const router = useRouter();
	const customerId = Number.parseInt(id as string, 10);

	const { data, isLoading } = trpc.customers.getById.useQuery({ id: customerId });
	const utils = trpc.useUtils();

	// Ledger state
	const [ledgerOpen, setLedgerOpen] = useState(false);
	const [ledgerType, setLedgerType] = useState<"points" | "credit">("credit");
	const [ledgerAmount, setLedgerAmount] = useState("");
	const [ledgerReason, setLedgerReason] = useState("");

	// Contacts state
	const [contactOpen, setContactOpen] = useState(false);
	const [contactData, setContactData] = useState({
		name: "",
		email: "",
		phone: "",
		designation: "",
		is_primary: false,
	});

	const _updateCustomer = trpc.customers.update.useMutation({
		onSuccess: () => {
			toast.success("Profile updated");
			utils.customers.getById.invalidate();
		},
	});

	const adjustLedger = trpc.customers.adjustLedger.useMutation({
		onSuccess: () => {
			toast.success("Ledger adjusted");
			setLedgerOpen(false);
			setLedgerAmount("");
			setLedgerReason("");
			utils.customers.getById.invalidate();
		},
	});

	const addContact = trpc.customers.addContact.useMutation({
		onSuccess: () => {
			toast.success("Contact added");
			setContactOpen(false);
			setContactData({ name: "", email: "", phone: "", designation: "", is_primary: false });
			utils.customers.getById.invalidate();
		},
		onError: (e) => toast.error(e.message),
	});

	const deleteContact = trpc.customers.deleteContact.useMutation({
		onSuccess: () => {
			toast.success("Contact deleted");
			utils.customers.getById.invalidate();
		},
	});

	if (isLoading) return <div className="p-8">Loading customer profile...</div>;
	if (!data?.customer) return <div className="p-8">Customer not found</div>;

	const { customer, ledger } = data;

	const handleAdjust = () => {
		if (!ledgerAmount || Number.isNaN(Number.parseFloat(ledgerAmount)))
			return toast.error("Valid amount required");
		if (!ledgerReason) return toast.error("Reason required");
		adjustLedger.mutate({
			id: customerId,
			type: ledgerType,
			amount: Number.parseFloat(ledgerAmount),
			reason: ledgerReason,
		});
	};

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-6 p-4">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" onClick={() => router.push("/sales/customers")}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="font-bold text-3xl">{customer.name}</h1>
					<p className="text-muted-foreground">
						{customer.customer_code || "No ID"} • Joined{" "}
						{format(new Date(customer.created_at || new Date()), "PP")}
					</p>
				</div>
				<div className="ml-auto flex items-center gap-2">
					<span
						className={`rounded-full px-3 py-1 font-semibold text-sm capitalize ${
							customer.loyalty_tier === "gold"
								? "bg-yellow-100 text-yellow-800"
								: customer.loyalty_tier === "silver"
									? "bg-gray-200 text-gray-800"
									: "bg-orange-100 text-orange-800"
						}`}
					>
						{customer.loyalty_tier || "Bronze"} Tier
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				{/* Left Sidebar */}
				<Card className="h-fit md:col-span-1">
					<CardHeader>
						<CardTitle>Profile Info</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-3">
							<Mail className="h-4 w-4 text-muted-foreground" />
							<span>{customer.email || "No email"}</span>
						</div>
						<div className="flex items-center gap-3">
							<Phone className="h-4 w-4 text-muted-foreground" />
							<span>{customer.phone || "No phone"}</span>
						</div>
						<div className="flex items-center gap-3">
							<MapPin className="h-4 w-4 text-muted-foreground" />
							<span>{customer.address || "No address"}</span>
						</div>
						<div className="flex items-center gap-3">
							<ShieldCheck className="h-4 w-4 text-muted-foreground" />
							<span>Marketing: {customer.marketing_opt_in ? "Opted In" : "Opted Out"}</span>
						</div>
					</CardContent>
				</Card>

				{/* Main Content Tabs */}
				<div className="md:col-span-2">
					<Tabs defaultValue="orders" className="w-full">
						<TabsList className="w-full justify-start">
							<TabsTrigger value="wallet" className="flex-1">Wallet</TabsTrigger>
							<TabsTrigger value="orders" className="flex-1">Orders</TabsTrigger>
							<TabsTrigger value="contacts" className="flex-1">Contacts</TabsTrigger>
						</TabsList>

						{/* Wallet Tab */}
						<TabsContent value="wallet" className="space-y-4 pt-4">
							<div className="grid grid-cols-2 gap-4">
								<Card>
									<CardHeader className="pb-2">
										<CardTitle className="flex justify-between font-medium text-sm">
											Store Credit
											<Wallet className="h-4 w-4 text-blue-500" />
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="font-bold text-2xl">₹{customer.store_credit || "0.00"}</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="pb-2">
										<CardTitle className="flex justify-between font-medium text-sm">
											Loyalty Points
											<Gift className="h-4 w-4 text-orange-500" />
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="font-bold text-2xl">{customer.loyalty_points || 0} pts</div>
									</CardContent>
								</Card>
							</div>
							<div className="flex justify-end gap-2">
								<Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
									<DialogTrigger asChild>
										<Button onClick={() => setLedgerType("credit")}>Adjust Credit</Button>
									</DialogTrigger>
									<DialogTrigger asChild>
										<Button variant="outline" onClick={() => setLedgerType("points")}>
											Adjust Points
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>
												Adjust {ledgerType === "credit" ? "Store Credit" : "Loyalty Points"}
											</DialogTitle>
										</DialogHeader>
										<div className="space-y-4 py-4">
											<div className="space-y-2">
												<Label>Amount</Label>
												<Input
													type="number"
													value={ledgerAmount}
													onChange={(e) => setLedgerAmount(e.target.value)}
													placeholder="Enter amount"
												/>
											</div>
											<div className="space-y-2">
												<Label>Reason</Label>
												<Input
													value={ledgerReason}
													onChange={(e) => setLedgerReason(e.target.value)}
													placeholder="Reason for adjustment"
												/>
											</div>
										</div>
										<DialogFooter>
											<Button variant="outline" onClick={() => setLedgerOpen(false)}>Cancel</Button>
											<Button onClick={handleAdjust} disabled={adjustLedger.isPending}>
												{adjustLedger.isPending ? "Saving..." : "Confirm"}
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</div>
							<Card>
								<CardHeader>
									<CardTitle>Ledger History</CardTitle>
								</CardHeader>
								<CardContent>
									<table className="w-full border-collapse text-left text-sm">
										<thead>
											<tr className="border-b">
												<th className="py-2">Date</th>
												<th>Type</th>
												<th>Reason</th>
												<th className="text-right">Amount</th>
											</tr>
										</thead>
										<tbody>
											{ledger?.map((entry: any) => (
												<tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50">
													<td className="py-2">{format(new Date(entry.created_at), "PP")}</td>
													<td className="capitalize">{entry.type}</td>
													<td>{entry.reason}</td>
													<td
														className={`text-right font-medium ${
															Number.parseFloat(entry.amount) > 0 ? "text-green-600" : "text-red-600"
														}`}
													>
														{Number.parseFloat(entry.amount) > 0 ? "+" : ""}
														{entry.amount}
													</td>
												</tr>
											))}
											{ledger?.length === 0 && (
												<tr>
													<td colSpan={4} className="py-4 text-center text-muted-foreground">
														No ledger entries
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Orders Tab */}
						<TabsContent value="orders" className="space-y-4 pt-4">
							<Card>
								<CardHeader>
									<CardTitle>Purchase History</CardTitle>
								</CardHeader>
								<CardContent>
									<table className="w-full border-collapse text-left text-sm">
										<thead>
											<tr className="border-b">
												<th className="py-2">Date</th>
												<th>Order ID</th>
												<th>Status</th>
												<th className="text-right">Total</th>
											</tr>
										</thead>
										<tbody>
											{customer.orders?.map((order: any) => (
												<tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
													<td className="py-2">{format(new Date(order.created_at), "PP")}</td>
													<td>#{order.id}</td>
													<td className="capitalize">{order.status}</td>
													<td className="text-right font-medium">₹{order.total_amount}</td>
												</tr>
											))}
											{customer.orders?.length === 0 && (
												<tr>
													<td colSpan={4} className="py-4 text-center text-muted-foreground">
														No purchases yet
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Contacts Tab */}
						<TabsContent value="contacts" className="space-y-4 pt-4">
							<Card>
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<CardTitle>Contact Persons</CardTitle>
									<Button size="sm" onClick={() => setContactOpen(true)}>
										Add Contact
									</Button>
								</CardHeader>
								<CardContent>
									<table className="w-full border-collapse text-left text-sm">
										<thead>
											<tr className="border-b">
												<th className="py-2">Name</th>
												<th>Designation</th>
												<th>Phone</th>
												<th>Email</th>
												<th className="text-right">Action</th>
											</tr>
										</thead>
										<tbody>
											{customer.contacts?.map((contact: any) => (
												<tr key={contact.id} className="border-b last:border-0 hover:bg-muted/50">
													<td className="py-2 font-medium">
														{contact.name}
														{contact.is_primary && (
															<span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
																Primary
															</span>
														)}
													</td>
													<td>{contact.designation || "—"}</td>
													<td>{contact.phone || "—"}</td>
													<td>{contact.email || "—"}</td>
													<td className="text-right">
														<Button
															variant="ghost"
															size="sm"
															className="h-8 w-8 p-0 text-destructive"
															onClick={() => {
																if (confirm("Delete this contact?")) {
																	deleteContact.mutate({ id: contact.id });
																}
															}}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</td>
												</tr>
											))}
											{!customer.contacts?.length && (
												<tr>
													<td colSpan={5} className="py-4 text-center text-muted-foreground">
														No contacts added yet.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{/* Add Contact Dialog */}
			<Dialog open={contactOpen} onOpenChange={setContactOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Contact Person</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Name *</Label>
							<Input
								value={contactData.name}
								onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
								placeholder="Contact name"
							/>
						</div>
						<div className="space-y-2">
							<Label>Designation</Label>
							<Input
								value={contactData.designation}
								onChange={(e) => setContactData({ ...contactData, designation: e.target.value })}
								placeholder="e.g. Manager, Accountant"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Phone</Label>
								<Input
									value={contactData.phone}
									onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
									placeholder="Phone number"
								/>
							</div>
							<div className="space-y-2">
								<Label>Email</Label>
								<Input
									type="email"
									value={contactData.email}
									onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
									placeholder="Email address"
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setContactOpen(false)}>Cancel</Button>
						<Button
							onClick={() => addContact.mutate({ ...contactData, customer_id: customerId })}
							disabled={!contactData.name || addContact.isPending}
						>
							{addContact.isPending ? "Adding..." : "Add Contact"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
