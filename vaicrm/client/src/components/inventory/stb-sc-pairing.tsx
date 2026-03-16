import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link2, Search, CheckCircle, Package, CreditCard, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
type InventoryItem = {
  id: number | string;
  materialCode: string;
  materialName: string;
  materialType: "STB" | "SMART_CARD" | string;
  serialNumber: string;
  state: "available" | "allocated" | "faulty";
  owner: string;
};

type PairRecord = {
  id: string | number;
  stbSerial: string;
  stbModel: string;
  scSerial: string;
  scModel: string;
  pairedDate: string; // ISO date or yyyy-mm-dd
  pairedBy: string;
  status: "ACTIVE" | "INACTIVE";
};

// Static inventory (mix of STBs and Smart Cards)
const STATIC_INVENTORY: InventoryItem[] = [
  // STBs
  { id: 1, materialCode: "STB001", materialName: "HD Set-Top Box", materialType: "STB", serialNumber: "STB001234567", state: "available", owner: "Warehouse - Dar es Salaam" },
  { id: 2, materialCode: "STB002", materialName: "4K Set-Top Box", materialType: "STB", serialNumber: "STB001234568", state: "available", owner: "Warehouse - Dar es Salaam" },
  { id: 3, materialCode: "STB001", materialName: "HD Set-Top Box", materialType: "STB", serialNumber: "STB001234569", state: "allocated", owner: "OTC - Mwanza" },
  { id: 4, materialCode: "STB002", materialName: "4K Set-Top Box", materialType: "STB", serialNumber: "STB001234570", state: "available", owner: "Agent - John Mwamba" },
  // Smart Cards
  { id: 101, materialCode: "SC001", materialName: "Smart Card Basic", materialType: "SMART_CARD", serialNumber: "SC001987654", state: "available", owner: "Warehouse - Dar es Salaam" },
  { id: 102, materialCode: "SC002", materialName: "Smart Card Premium", materialType: "SMART_CARD", serialNumber: "SC001987655", state: "available", owner: "Warehouse - Dar es Salaam" },
  { id: 103, materialCode: "SC001", materialName: "Smart Card Basic", materialType: "SMART_CARD", serialNumber: "SC001987656", state: "allocated", owner: "OTC - Mwanza" },
  { id: 104, materialCode: "SC002", materialName: "Smart Card Premium", materialType: "SMART_CARD", serialNumber: "SC001987657", state: "available", owner: "Agent - Mary Kimaro" },
];

// Initial paired devices (static)
const INITIAL_PAIRS: PairRecord[] = [
  {
    id: 1,
    stbSerial: "STB001234567",
    stbModel: "HD Set-Top Box",
    scSerial: "SC001987654",
    scModel: "Smart Card Premium",
    pairedDate: "2024-01-15",
    pairedBy: "TECH_USER",
    status: "ACTIVE",
  },
  {
    id: 2,
    stbSerial: "STB001234568",
    stbModel: "4K Set-Top Box",
    scSerial: "SC001987655",
    scModel: "Smart Card Basic",
    pairedDate: "2024-01-20",
    pairedBy: "FIELD_TECH",
    status: "ACTIVE",
  },
];

// Map inventory states to Badge variant
const invStateToBadgeVariant = (state?: InventoryItem["state"]) => {
  const s = String(state || "").toLowerCase();
  if (s === "available") return "success" as const;
  if (s === "allocated") return "warning" as const;
  if (s === "faulty") return "danger" as const;
  return "muted" as const;
};

// Map pair status to Badge variant
const pairStatusToBadgeVariant = (status: PairRecord["status"]) => {
  return status === "ACTIVE" ? ("success" as const) : ("muted" as const);
};

export default function StbScPairing() {
  const [inventory] = useState<InventoryItem[]>(STATIC_INVENTORY);
  const [pairs, setPairs] = useState<PairRecord[]>(INITIAL_PAIRS);

  const [stbSmartCardPair, setStbSmartCardPair] = useState({ stbSerial: "", smartCardNo: "" });
  const [searchStb, setSearchStb] = useState("");
  const [searchSc, setSearchSc] = useState("");
  const [selectedStb, setSelectedStb] = useState<InventoryItem | null>(null);
  const [selectedSc, setSelectedSc] = useState<InventoryItem | null>(null);

  const [pairing, setPairing] = useState(false);
  const [unpairingId, setUnpairingId] = useState<string | number | null>(null);

  const { toast } = useToast();

  const stbItems = useMemo(
    () => inventory.filter((i) => i.materialType === "STB" || i.materialCode?.startsWith("STB")),
    [inventory]
  );
  const smartCardItems = useMemo(
    () => inventory.filter((i) => i.materialType === "SMART_CARD" || i.materialCode?.startsWith("SC")),
    [inventory]
  );

  // Exclude already paired (ACTIVE) devices from selection lists
  const pairedStbSet = useMemo(
    () => new Set(pairs.filter((p) => p.status === "ACTIVE").map((p) => p.stbSerial)),
    [pairs]
  );
  const pairedScSet = useMemo(
    () => new Set(pairs.filter((p) => p.status === "ACTIVE").map((p) => p.scSerial)),
    [pairs]
  );

  const availableStbs = useMemo(
    () => stbItems.filter((i) => !pairedStbSet.has(i.serialNumber)),
    [stbItems, pairedStbSet]
  );
  const availableScs = useMemo(
    () => smartCardItems.filter((i) => !pairedScSet.has(i.serialNumber)),
    [smartCardItems, pairedScSet]
  );

  const filteredStbs = useMemo(
    () =>
      availableStbs.filter(
        (item) =>
          item.serialNumber.toLowerCase().includes(searchStb.toLowerCase()) ||
          item.materialName.toLowerCase().includes(searchStb.toLowerCase())
      ),
    [availableStbs, searchStb]
  );
  const filteredScs = useMemo(
    () =>
      availableScs.filter(
        (item) =>
          item.serialNumber.toLowerCase().includes(searchSc.toLowerCase()) ||
          item.materialName.toLowerCase().includes(searchSc.toLowerCase())
      ),
    [availableScs, searchSc]
  );

  const handleSelectStb = (item: InventoryItem) => {
    setSelectedStb(item);
    setStbSmartCardPair((s) => ({ ...s, stbSerial: item.serialNumber }));
  };

  const handleSelectSc = (item: InventoryItem) => {
    setSelectedSc(item);
    setStbSmartCardPair((s) => ({ ...s, smartCardNo: item.serialNumber }));
  };

  const handleDevicePairing = async () => {
    const { stbSerial, smartCardNo } = stbSmartCardPair;

    if (!stbSerial || !smartCardNo) {
      toast({ title: "Please provide both STB Serial and Smart Card Number", variant: "destructive" });
      return;
    }

    const stb = stbItems.find((i) => i.serialNumber === stbSerial);
    const sc = smartCardItems.find((i) => i.serialNumber === smartCardNo);

    if (!stb) {
      toast({ title: "STB not found in inventory", variant: "destructive" });
      return;
    }
    if (!sc) {
      toast({ title: "Smart Card not found in inventory", variant: "destructive" });
      return;
    }
    if (pairedStbSet.has(stbSerial)) {
      toast({ title: "This STB is already paired", variant: "destructive" });
      return;
    }
    if (pairedScSet.has(smartCardNo)) {
      toast({ title: "This Smart Card is already paired", variant: "destructive" });
      return;
    }

    setPairing(true);
    setTimeout(() => {
      const newPair: PairRecord = {
        id: `PAIR_${Date.now()}`,
        stbSerial,
        stbModel: stb.materialName,
        scSerial: smartCardNo,
        scModel: sc.materialName,
        pairedDate: new Date().toISOString().slice(0, 10),
        pairedBy: "CURRENT_USER",
        status: "ACTIVE",
      };
      setPairs((prev) => [newPair, ...prev]);
      setSelectedStb(null);
      setSelectedSc(null);
      setStbSmartCardPair({ stbSerial: "", smartCardNo: "" });
      toast({ title: "STB and Smart Card paired successfully" });
      setPairing(false);
    }, 300);
  };

  const handleUnpair = (pairId: string | number) => {
    setUnpairingId(pairId);
    setTimeout(() => {
      setPairs((prev) => {
        const idx = prev.findIndex((p) => p.id === pairId);
        if (idx === -1) return prev;
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      });
      setUnpairingId(null);
      toast({ title: "Devices unpaired successfully" });
    }, 300);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">STB - Smart Card Pairing</h1>
            <p className="text-green-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Pair Set-Top Boxes with Smart Cards for Nagra system
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* STB Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Select Set-Top Box
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input
                uiSize="sm"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchStb}
                onChange={(e) => setSearchStb(e.target.value)}
                placeholder="Search STB by serial number or model..."
                list="stb-suggestions"
              />
              <datalist id="stb-suggestions">
                {availableStbs.slice(0, 50).map((i) => (
                  <option key={i.serialNumber} value={i.serialNumber}>
                    {i.serialNumber} - {i.materialName}
                  </option>
                ))}
              </datalist>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredStbs.length > 0 ? (
                  filteredStbs.slice(0, 6).map((item) => {
                    const isSelected = selectedStb?.id === item.id;
                    return (
                      <Button
                        key={item.id}
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => handleSelectStb(item)}
                      >
                        <div className="text-left">
                          <div className="text-sm font-medium">{item.materialName}</div>
                          <div className="text-xs font-mono text-gray-600">{item.serialNumber}</div>
                        </div>
                        <Badge variant={invStateToBadgeVariant(item.state)} size="sm">
                          {item.state}
                        </Badge>
                      </Button>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">No STBs found</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Card Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Select Smart Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input
                uiSize="sm"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchSc}
                onChange={(e) => setSearchSc(e.target.value)}
                placeholder="Search Smart Card by serial number or model..."
                list="sc-suggestions"
              />
              <datalist id="sc-suggestions">
                {availableScs.slice(0, 50).map((i) => (
                  <option key={i.serialNumber} value={i.serialNumber}>
                    {i.serialNumber} - {i.materialName}
                  </option>
                ))}
              </datalist>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredScs.length > 0 ? (
                  filteredScs.slice(0, 6).map((item) => {
                    const isSelected = selectedSc?.id === item.id;
                    return (
                      <Button
                        key={item.id}
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => handleSelectSc(item)}
                      >
                        <div className="text-left">
                          <div className="text-sm font-medium">{item.materialName}</div>
                          <div className="text-xs font-mono text-gray-600">{item.serialNumber}</div>
                        </div>
                        <Badge variant={invStateToBadgeVariant(item.state)} size="sm">
                          {item.state}
                        </Badge>
                      </Button>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">No Smart Cards found</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pairing Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link2 className="w-5 h-5 mr-2" />
              Device Pairing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stbSerial">STB Serial Number</Label>
              <Input
                id="stbSerial"
                uiSize="sm"
                value={stbSmartCardPair.stbSerial}
                onChange={(e) => setStbSmartCardPair({ ...stbSmartCardPair, stbSerial: e.target.value })}
                placeholder="Enter STB serial number"
                readOnly={!!selectedStb}
                list="stb-suggestions"
              />
            </div>

            <div>
              <Label htmlFor="smartCardNo">Smart Card Number</Label>
              <Input
                id="smartCardNo"
                uiSize="sm"
                value={stbSmartCardPair.smartCardNo}
                onChange={(e) => setStbSmartCardPair({ ...stbSmartCardPair, smartCardNo: e.target.value })}
                placeholder="Enter smart card number"
                readOnly={!!selectedSc}
                list="sc-suggestions"
              />
            </div>

            {(selectedStb || selectedSc) && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Selected Devices</h4>
                {selectedStb && (
                  <div className="text-xs mb-2">
                    <p><span className="text-gray-600">STB:</span> {selectedStb.materialName}</p>
                    <p><span className="text-gray-600">Serial:</span> {selectedStb.serialNumber}</p>
                  </div>
                )}
                {selectedSc && (
                  <div className="text-xs">
                    <p><span className="text-gray-600">Smart Card:</span> {selectedSc.materialName}</p>
                    <p><span className="text-gray-600">Serial:</span> {selectedSc.serialNumber}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleDevicePairing}
                size="xs"
                disabled={pairing || !stbSmartCardPair.stbSerial || !stbSmartCardPair.smartCardNo}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {pairing ? "Pairing..." : "Pair Devices"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Paired Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Link2 className="w-5 h-5 mr-2" />
            Currently Paired Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pairs.length > 0 ? (
              pairs.map((pair) => (
                <div key={pair.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <div className="flex items-center mb-2">
                        <Package className="w-4 h-4 mr-2" />
                        <span className="font-medium text-sm">{pair.stbModel}</span>
                      </div>
                      <p className="text-xs text-gray-600 font-mono">{pair.stbSerial}</p>
                    </div>

                    <div>
                      <div className="flex items-center mb-2">
                        <CreditCard className="w-4 h-4 mr-2" />
                        <span className="font-medium text-sm">{pair.scModel}</span>
                      </div>
                      <p className="text-xs text-gray-600 font-mono">{pair.scSerial}</p>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <Badge variant={pairStatusToBadgeVariant(pair.status)} size="sm">{pair.status}</Badge>
                        <p className="text-xs text-gray-500">Paired: {new Date(pair.pairedDate).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">By: {pair.pairedBy}</p>
                      </div>
                      <Button
                        onClick={() => handleUnpair(pair.id)}
                        variant="destructive"
                        size="xs"
                        disabled={unpairingId === pair.id}
                      >
                        <Unlink className="w-4 h-4 mr-1" />
                        {unpairingId === pair.id ? "Unpairing..." : "Unpair"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Link2 className="w-12 h-12 mx-auto mb-3" />
                <p>No paired devices found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}