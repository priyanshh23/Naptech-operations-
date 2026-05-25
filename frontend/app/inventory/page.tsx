"use client";

import { History, PackagePlus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { inventoryItems as initialInventory, inventoryLogs } from "@/lib/mock-data";
import type { InventoryItem } from "@/lib/types";
import { formatDateTime, titleCase } from "@/lib/format";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) {
      return items;
    }
    return items.filter(
      (item) =>
        item.product_name.toLowerCase().includes(query) ||
        item.sku_code.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query),
    );
  }, [items, search]);

  function saveItem(formData: FormData) {
    const quantity = Number(formData.get("quantity"));
    const minimumStock = Number(formData.get("minimum_stock"));
    const payload = {
      product_name: String(formData.get("product_name")),
      sku_code: String(formData.get("sku_code")),
      quantity,
      minimum_stock: minimumStock,
      location: String(formData.get("location")),
    };

    if (editingItem) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ...payload,
                is_low_stock: quantity <= minimumStock,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    } else {
      setItems((current) => [
        {
          id: Date.now(),
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_low_stock: quantity <= minimumStock,
        },
        ...current,
      ]);
    }

    setEditingItem(null);
    setShowForm(false);
  }

  function deleteItem(id: number) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <Button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
          >
            <PackagePlus size={18} />
            Add Item
          </Button>
        }
        description="Manage stock levels, locations, SKU codes, and low stock alerts."
        title="Inventory"
      />

      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex h-11 w-full items-center gap-2 rounded-md border border-border bg-white px-3 md:max-w-md">
            <Search size={18} className="text-muted-foreground" />
            <input
              className="w-full outline-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, SKU, or location"
              value={search}
            />
          </label>
          <div className="text-sm text-muted-foreground">{filteredItems.length} items visible</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4">Product</th>
                <th className="py-3 pr-4">SKU</th>
                <th className="py-3 pr-4">Quantity</th>
                <th className="py-3 pr-4">Minimum</th>
                <th className="py-3 pr-4">Location</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr className="border-b border-border last:border-0" key={item.id}>
                  <td className="py-4 pr-4 font-medium text-slate-950">{item.product_name}</td>
                  <td className="py-4 pr-4 text-slate-700">{item.sku_code}</td>
                  <td className="py-4 pr-4 text-slate-700">{item.quantity}</td>
                  <td className="py-4 pr-4 text-slate-700">{item.minimum_stock}</td>
                  <td className="py-4 pr-4 text-slate-700">{item.location}</td>
                  <td className="py-4 pr-4">
                    <Badge tone={item.is_low_stock ? "danger" : "success"}>
                      {item.is_low_stock ? "Low Stock" : "Healthy"}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-slate-700"
                        onClick={() => {
                          setEditingItem(item);
                          setShowForm(true);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${item.product_name}`}
                        className="rounded-md border border-border p-2 text-red-600"
                        onClick={() => deleteItem(item.id)}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <History size={18} className="text-cyan-700" />
          <h2 className="text-base font-semibold text-slate-950">Movement History</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {inventoryLogs.map((log) => (
            <div className="rounded-md border border-border p-4" key={log.id}>
              <Badge tone={log.quantity_changed < 0 ? "danger" : "success"}>{titleCase(log.action_type)}</Badge>
              <p className="mt-3 text-lg font-semibold text-slate-950">
                {log.quantity_changed > 0 ? "+" : ""}
                {log.quantity_changed}
              </p>
              <p className="text-sm text-muted-foreground">{formatDateTime(log.timestamp)}</p>
            </div>
          ))}
        </div>
      </Card>

      {showForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
          <Card className="w-full max-w-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">
                {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
              </h2>
              <p className="text-sm text-muted-foreground">Update the stock master used by supervisors.</p>
            </div>
            <form action={saveItem} className="grid gap-4 md:grid-cols-2">
              <Field defaultValue={editingItem?.product_name} label="Product Name" name="product_name" />
              <Field defaultValue={editingItem?.sku_code} label="SKU Code" name="sku_code" />
              <Field defaultValue={editingItem?.quantity} label="Quantity" name="quantity" type="number" />
              <Field
                defaultValue={editingItem?.minimum_stock}
                label="Minimum Stock"
                name="minimum_stock"
                type="number"
              />
              <Field defaultValue={editingItem?.location} label="Location" name="location" />
              <div className="flex items-end gap-3 md:col-span-2">
                <Button type="submit">{editingItem ? "Save Changes" : "Add Item"}</Button>
                <button
                  className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-slate-700"
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}

function Field({
  defaultValue,
  label,
  name,
  type = "text",
}: Readonly<{
  defaultValue?: string | number;
  label: string;
  name: string;
  type?: string;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <input
        className="h-11 w-full rounded-md border border-border px-3 outline-none"
        defaultValue={defaultValue}
        min={type === "number" ? 0 : undefined}
        name={name}
        required
        type={type}
      />
    </label>
  );
}

