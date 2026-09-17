import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/formatters';
import { CostComponentType } from '@zr-erp/shared';
import {
  Layers,
  Plus,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Tag,
  Boxes,
  Trash2,
  RefreshCw,
  Edit3,
  Image as ImageIcon,
  Upload,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface CostComponent {
  id?: string;
  name: string;
  type: CostComponentType;
  cost: number;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  sellingPrice: number;
  compareAtPrice?: number;
  imageUrl?: string | null;
  images?: string[];
  features?: string[];
  totalCost: number;
  grossProfit: number;
  grossMarginPercentage: number;
  costComponents: CostComponent[];
  variants: ProductVariant[];
  isActive: boolean;
}

interface Material {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  stockQuantity: number;
  reorderPoint: number;
  isLowStock: boolean;
}

export const ProductsPage: React.FC = () => {
  const { isViewer } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'materials'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState<string | null>(null);
  const [showAddVariantModal, setShowAddVariantModal] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<{ productId: string; variantId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // New product form
  const [newProd, setNewProd] = useState({
    name: '',
    sku: '',
    description: '',
    sellingPrice: 2500,
    compareAtPrice: 3500,
    imageUrl: '',
    images: [] as string[],
    features: [] as string[],
    newFeatureText: '',
    newImageUrlText: '',
    components: [
      { name: 'T-Shirt Vierge', type: CostComponentType.BASE_ITEM, cost: 700 },
      { name: 'Impression DTF HD', type: CostComponentType.PRINTING, cost: 400 },
      { name: 'Packaging & Étiquette', type: CostComponentType.PACKAGING, cost: 50 },
    ],
  });

  // Edit product form
  const [editProd, setEditProd] = useState({
    name: '',
    description: '',
    sellingPrice: 2500,
    compareAtPrice: 3500,
    imageUrl: '',
    images: [] as string[],
    features: [] as string[],
    newFeatureText: '',
    newImageUrlText: '',
  });

  // New component form
  const [newComp, setNewComp] = useState({
    name: '',
    type: CostComponentType.OTHER,
    cost: 100,
  });

  // New variant form
  const [newVar, setNewVar] = useState({
    name: '',
    sku: '',
    stockQuantity: 20,
  });

  // New material form
  const [newMat, setNewMat] = useState({
    name: '',
    unit: 'pcs',
    unitCost: 500,
    stockQuantity: 50,
    reorderPoint: 10,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, matRes] = await Promise.all([
        fetchApi<{ products: Product[] }>('/products'),
        fetchApi<{ materials: Material[] }>('/materials'),
      ]);
      setProducts(prodRes.products);
      setMaterials(matRes.materials);
      if (prodRes.products.length > 0 && !expandedProduct) {
        setExpandedProduct(prodRes.products[0].id);
      }
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustStock = async (variantId: string, quantityChange: number, productId: string) => {
    try {
      await fetchApi(`/products/${productId}/variants/${variantId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ quantityChange }),
      });
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleAdjustMaterial = async (matId: string, delta: number) => {
    try {
      await fetchApi(`/materials/${matId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ delta }),
      });
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 3 * 1024 * 1024) {
        setNotice("L'image est trop volumineuse (max 3 Mo). Veuillez en choisir une plus légère.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          if (isEditing) {
            setEditProd(prev => ({
              ...prev,
              images: [...prev.images, result],
              imageUrl: prev.imageUrl || result
            }));
          } else {
            setNewProd(prev => ({
              ...prev,
              images: [...prev.images, result],
              imageUrl: prev.imageUrl || result
            }));
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newProd.name,
          sku: newProd.sku,
          description: newProd.description,
          sellingPrice: Number(newProd.sellingPrice),
          compareAtPrice: Number(newProd.compareAtPrice) || 0,
          imageUrl: newProd.images.length > 0 ? newProd.images[0] : (newProd.imageUrl || null),
          images: newProd.images,
          features: newProd.features,
          costComponents: newProd.components,
        }),
      });
      setNotice(`Produit ${newProd.name} créé avec succès.`);
      setShowProductModal(false);
      setNewProd({
        name: '',
        sku: '',
        description: '',
        sellingPrice: 2500,
        compareAtPrice: 3500,
        imageUrl: '',
        images: [],
        features: [],
        newFeatureText: '',
        newImageUrlText: '',
        components: [
          { name: 'T-Shirt Vierge', type: CostComponentType.BASE_ITEM, cost: 700 },
          { name: 'Impression DTF HD', type: CostComponentType.PRINTING, cost: 400 },
          { name: 'Packaging & Étiquette', type: CostComponentType.PACKAGING, cost: 50 },
        ],
      });
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProd({
      name: product.name,
      description: product.description || '',
      sellingPrice: product.sellingPrice,
      compareAtPrice: product.compareAtPrice || Math.round(product.sellingPrice * 1.35),
      imageUrl: product.imageUrl || '',
      images: product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [product.imageUrl] : []),
      features: product.features || [],
      newFeatureText: '',
      newImageUrlText: '',
    });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await fetchApi(`/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editProd.name,
          description: editProd.description || null,
          sellingPrice: Number(editProd.sellingPrice),
          compareAtPrice: Number(editProd.compareAtPrice) || 0,
          imageUrl: editProd.images.length > 0 ? editProd.images[0] : (editProd.imageUrl || null),
          images: editProd.images,
          features: editProd.features,
        }),
      });
      setNotice(`Produit ${editProd.name} mis à jour avec succès.`);
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleAddComponent = async (productId: string) => {
    try {
      await fetchApi(`/products/${productId}/components`, {
        method: 'POST',
        body: JSON.stringify({
          name: newComp.name,
          type: newComp.type,
          cost: Number(newComp.cost),
        }),
      });
      setShowAddComponentModal(null);
      setNewComp({ name: '', type: CostComponentType.OTHER, cost: 100 });
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleDeleteComponent = async (productId: string, componentId: string) => {
    try {
      await fetchApi(`/products/${productId}/components/${componentId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleAddVariant = async (productId: string) => {
    try {
      await fetchApi(`/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          name: newVar.name,
          sku: newVar.sku,
          stockQuantity: Number(newVar.stockQuantity),
        }),
      });
      setShowAddVariantModal(null);
      setNewVar({ name: '', sku: '', stockQuantity: 20 });
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/materials', {
        method: 'POST',
        body: JSON.stringify(newMat),
      });
      setNotice(`Matière première ${newMat.name} ajoutée.`);
      setShowMaterialModal(false);
      setNewMat({ name: '', unit: 'pcs', unitCost: 500, stockQuantity: 50, reorderPoint: 10 });
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await fetchApi(`/products/${productToDelete.id}`, { method: 'DELETE' });
      setNotice(`Produit "${productToDelete.name}" supprimé avec succès.`);
      setProductToDelete(null);
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (!variantToDelete) return;
    try {
      setIsDeleting(true);
      await fetchApi(`/products/${variantToDelete.productId}/variants/${variantToDelete.variantId}`, { method: 'DELETE' });
      setNotice(`Déclinaison "${variantToDelete.name}" supprimée avec succès.`);
      setVariantToDelete(null);
      loadData();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick stats
  const lowStockMaterials = materials.filter(m => m.isLowStock);
  const avgMargin = products.length > 0
    ? Math.round(products.reduce((s, p) => s + p.grossMarginPercentage, 0) / products.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 3 : Coût de Revient POD & Stock
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Produits & Décomposition des Coûts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Moteur de calcul de rentabilité par composant (T-shirt + DTF + Packaging) et gestion des stocks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Marge Brute Moyenne</p>
            <p className="text-lg font-black text-emerald-600">{avgMargin}%</p>
          </div>
          {lowStockMaterials.length > 0 && (
            <div className="bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 text-center">
              <p className="text-[10px] font-semibold text-amber-700 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Alerte Stock
              </p>
              <p className="text-lg font-black text-amber-900">{lowStockMaterials.length} matières</p>
            </div>
          )}
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex justify-between items-center">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
              activeSubTab === 'products'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Produits Finis Print-on-Demand ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('materials')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
              activeSubTab === 'materials'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Matières Premières & Stock ({materials.length})</span>
          </button>
        </div>

        {!isViewer && (
          <div>
            {activeSubTab === 'products' ? (
              <button
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors mb-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Produit POD</span>
              </button>
            ) : (
              <button
                onClick={() => setShowMaterialModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors mb-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Matière Première</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Subtab 1: Products */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {products.map((product) => {
            const isExpanded = expandedProduct === product.id;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Product Card Header */}
                <div
                  onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 border border-blue-100">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{product.name}</h3>
                        <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                          {product.sku}
                        </span>
                        {product.images && product.images.length > 0 && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            {product.images.length} photos
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{product.description || 'Aucune description'}</p>
                    </div>
                  </div>

                  {/* Financial metrics display */}
                  <div className="flex items-center gap-6">
                    <div className="text-end">
                      <p className="text-[11px] text-slate-400 font-medium">Prix de Vente</p>
                      <p className="text-base font-extrabold text-slate-900">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                    </div>

                    <div className="text-end">
                      <p className="text-[11px] text-slate-400 font-medium">Coût de Revient</p>
                      <p className="text-base font-extrabold text-amber-600">
                        {formatCurrency(product.totalCost)}
                      </p>
                    </div>

                    <div className="text-end">
                      <p className="text-[11px] text-slate-400 font-medium">Marge Brute</p>
                      <p className="text-base font-extrabold text-emerald-600">
                        +{formatCurrency(product.grossProfit)}
                      </p>
                    </div>

                    <div className="hidden sm:flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Rentabilité</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                        {product.grossMarginPercentage}%
                      </span>
                    </div>

                    {!isViewer && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://erp-zrfactory-store.vercel.app/?product=${product.id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Voir la page produit dans le Store client"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditProduct(product);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Modifier les photos, la description et les tarifs"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Supprimer ce produit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Cost Components + Variants */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-6">
                    {/* Cost Breakdown Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-2">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-blue-600" />
                          Décomposition du Coût de Revient (11. Print-on-demand Costing)
                        </span>
                        <span className="text-slate-500">
                          Total: <strong className="text-slate-900">{formatCurrency(product.totalCost)}</strong> sur {formatCurrency(product.sellingPrice)}
                        </span>
                      </div>

                      {/* Visual segmented bar */}
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex shadow-inner">
                        {product.costComponents.map((c, idx) => {
                          const widthPct = product.sellingPrice > 0 ? (c.cost / product.sellingPrice) * 100 : 0;
                          const bgColors = ['bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-amber-600'];
                          return (
                            <div
                              key={c.id || idx}
                              style={{ width: `${widthPct}%` }}
                              className={`${bgColors[idx % bgColors.length]} h-full transition-all`}
                              title={`${c.name}: ${formatCurrency(c.cost)}`}
                            />
                          );
                        })}
                        {/* Margin segment */}
                        <div
                          style={{ width: `${Math.max(0, product.grossMarginPercentage)}%` }}
                          className="bg-emerald-500 h-full transition-all"
                          title={`Marge brute: ${formatCurrency(product.grossProfit)}`}
                        />
                      </div>
                    </div>

                    {/* Cost components grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Components list */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Composants de Coût ({product.costComponents.length})
                          </h4>
                          {!isViewer && (
                            <button
                              onClick={() => setShowAddComponentModal(product.id)}
                              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Ajouter
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {product.costComponents.map((comp) => (
                            <div
                              key={comp.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{comp.name}</span>
                                <span className="block text-[10px] text-slate-400 font-mono">{comp.type}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900">{formatCurrency(comp.cost)}</span>
                                {!isViewer && comp.id && (
                                  <button
                                    onClick={() => handleDeleteComponent(product.id, comp.id!)}
                                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Variants and Stock */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Déclinaisons & Stock ({product.variants.length})
                          </h4>
                          {!isViewer && (
                            <button
                              onClick={() => setShowAddVariantModal(product.id)}
                              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Variante
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {product.variants.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800">{v.name}</span>
                                <span className="block text-[10px] text-slate-400 font-mono">{v.sku}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                                  v.stockQuantity > 10
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {v.stockQuantity} en stock
                                </span>

                                {!isViewer && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleAdjustStock(v.id, -1, product.id)}
                                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-bold text-xs"
                                    >
                                      -1
                                    </button>
                                    <button
                                      onClick={() => handleAdjustStock(v.id, 5, product.id)}
                                      className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-bold text-xs"
                                    >
                                      +5
                                    </button>
                                    <button
                                      onClick={() => setVariantToDelete({ productId: product.id, variantId: v.id, name: v.name })}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors ml-0.5"
                                      title="Supprimer cette variante"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Subtab 2: Materials & Stock */}
      {activeSubTab === 'materials' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-start">Matière Première</th>
                  <th className="px-4 py-3 text-start">Unité</th>
                  <th className="px-4 py-3 text-end">Coût Unitaire</th>
                  <th className="px-4 py-3 text-center">Stock Disponible</th>
                  <th className="px-4 py-3 text-center">Seuil d'Alerte</th>
                  <th className="px-4 py-3 text-end">Ajustement Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {m.isLowStock && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{m.unit}</td>
                    <td className="px-4 py-3 text-end font-semibold text-slate-800">
                      {formatCurrency(m.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                        m.isLowStock
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {m.stockQuantity} {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">
                      {m.reorderPoint} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {!isViewer && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAdjustMaterial(m.id, -1)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleAdjustMaterial(m.id, 5)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-bold"
                          >
                            +5
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Nouveau Produit Print-on-Demand</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Produit *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: T-Shirt Oversized ZR"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code SKU Unique *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TSHIRT-OVR-001"
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prix de Vente (DZD) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProd.sellingPrice}
                    onChange={(e) => setNewProd({ ...newProd, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Barré / Ancien Prix (DZD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 3500 (pour afficher -30%)"
                    value={newProd.compareAtPrice}
                    onChange={(e) => setNewProd({ ...newProd, compareAtPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description Détaillée du Produit</label>
                <textarea
                  rows={3}
                  placeholder="Décrivez les matières, la coupe, la qualité d'impression DTF et les usages..."
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs leading-relaxed"
                />
              </div>

              {/* Product Images & Gallery */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Photos & Galerie du Produit ({newProd.images.length})</span>
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Add Image by URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Ou collez un lien URL d'image (https://...)"
                    value={newProd.newImageUrlText}
                    onChange={(e) => setNewProd({ ...newProd, newImageUrlText: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newProd.newImageUrlText.trim()) {
                        setNewProd(prev => ({
                          ...prev,
                          images: [...prev.images, prev.newImageUrlText.trim()],
                          imageUrl: prev.imageUrl || prev.newImageUrlText.trim(),
                          newImageUrlText: ''
                        }));
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
                  >
                    Ajouter URL
                  </button>
                </div>

                {/* Image Thumbnails */}
                {newProd.images.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                    {newProd.images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white">
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = newProd.images.filter((_, i) => i !== idx);
                            setNewProd({
                              ...newProd,
                              images: updated,
                              imageUrl: updated.length > 0 ? updated[0] : ''
                            });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-90 group-hover:opacity-100 shadow"
                          title="Supprimer cette image"
                        >
                          ✕
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] px-1 rounded font-bold">
                            Couverture
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Aucune photo ajoutée. Importez des photos depuis votre appareil ou ajoutez une URL.
                  </p>
                )}
              </div>

              {/* Product Features (Bullet points for landing page) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Caractéristiques & Points Forts (Landing Page)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: قطن بيور 100% عالي الجودة"
                    value={newProd.newFeatureText}
                    onChange={(e) => setNewProd({ ...newProd, newFeatureText: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newProd.newFeatureText.trim()) {
                        setNewProd(prev => ({
                          ...prev,
                          features: [...prev.features, prev.newFeatureText.trim()],
                          newFeatureText: ''
                        }));
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
                  >
                    Ajouter
                  </button>
                </div>
                {newProd.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {newProd.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-medium"
                      >
                        <span>{feat}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProd({
                              ...newProd,
                              features: newProd.features.filter((_, i) => i !== idx)
                            });
                          }}
                          className="hover:text-rose-600 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Initial Cost Components */}
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs font-bold text-slate-700 mb-2">Composants de Coût POD (Calcul de Marge)</p>
                <div className="space-y-2">
                  {newProd.components.map((comp, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => {
                          const updated = [...newProd.components];
                          updated[idx].name = e.target.value;
                          setNewProd({ ...newProd, components: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        value={comp.cost}
                        onChange={(e) => {
                          const updated = [...newProd.components];
                          updated[idx].cost = Number(e.target.value);
                          setNewProd({ ...newProd, components: updated });
                        }}
                        className="w-24 px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-end"
                      />
                      <span className="text-xs text-slate-400">DA</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Créer le Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <span>Modifier le Produit: {editingProduct.name}</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">SKU: {editingProduct.sku}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Produit *</label>
                <input
                  type="text"
                  required
                  value={editProd.name}
                  onChange={(e) => setEditProd({ ...editProd, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prix de Vente (DZD) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editProd.sellingPrice}
                    onChange={(e) => setEditProd({ ...editProd, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Barré / Comparaison (DZD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 3500"
                    value={editProd.compareAtPrice}
                    onChange={(e) => setEditProd({ ...editProd, compareAtPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description Complète</label>
                <textarea
                  rows={3}
                  value={editProd.description}
                  onChange={(e) => setEditProd({ ...editProd, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs leading-relaxed"
                />
              </div>

              {/* Product Images & Gallery */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Photos & Galerie ({editProd.images.length})</span>
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ajouter des photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Add Image by URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Ou collez un lien URL d'image (https://...)"
                    value={editProd.newImageUrlText}
                    onChange={(e) => setEditProd({ ...editProd, newImageUrlText: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editProd.newImageUrlText.trim()) {
                        setEditProd(prev => ({
                          ...prev,
                          images: [...prev.images, prev.newImageUrlText.trim()],
                          imageUrl: prev.imageUrl || prev.newImageUrlText.trim(),
                          newImageUrlText: ''
                        }));
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
                  >
                    Ajouter URL
                  </button>
                </div>

                {/* Image Thumbnails */}
                {editProd.images.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                    {editProd.images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white">
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editProd.images.filter((_, i) => i !== idx);
                            setEditProd({
                              ...editProd,
                              images: updated,
                              imageUrl: updated.length > 0 ? updated[0] : ''
                            });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-90 group-hover:opacity-100 shadow"
                          title="Supprimer cette image"
                        >
                          ✕
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] px-1 rounded font-bold">
                            Couverture
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Aucune photo pour ce produit. Importez-en pour l'afficher sur la page produit client.
                  </p>
                )}
              </div>

              {/* Product Features */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Caractéristiques & Points Forts (Landing Page)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: قطن بيور 100% عالي الجودة"
                    value={editProd.newFeatureText}
                    onChange={(e) => setEditProd({ ...editProd, newFeatureText: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editProd.newFeatureText.trim()) {
                        setEditProd(prev => ({
                          ...prev,
                          features: [...prev.features, prev.newFeatureText.trim()],
                          newFeatureText: ''
                        }));
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
                  >
                    Ajouter
                  </button>
                </div>
                {editProd.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editProd.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-medium"
                      >
                        <span>{feat}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditProd({
                              ...editProd,
                              features: editProd.features.filter((_, i) => i !== idx)
                            });
                          }}
                          className="hover:text-rose-600 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Cost Component */}
      {showAddComponentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Ajouter un Composant de Coût</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Composant</label>
                <input
                  type="text"
                  placeholder="Ex: Main d'œuvre pressage"
                  value={newComp.name}
                  onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type de Coût</label>
                <select
                  value={newComp.type}
                  onChange={(e) => setNewComp({ ...newComp, type: e.target.value as CostComponentType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value={CostComponentType.BASE_ITEM}>BASE_ITEM (Article Vierge)</option>
                  <option value={CostComponentType.PRINTING}>PRINTING (Impression DTF)</option>
                  <option value={CostComponentType.PACKAGING}>PACKAGING (Emballage)</option>
                  <option value={CostComponentType.LABOR}>LABOR (Main d'œuvre)</option>
                  <option value={CostComponentType.SHIPPING}>SHIPPING (Transport)</option>
                  <option value={CostComponentType.OTHER}>OTHER (Autre)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coût Unitaire (DZD)</label>
                <input
                  type="number"
                  min="0"
                  value={newComp.cost}
                  onChange={(e) => setNewComp({ ...newComp, cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddComponentModal(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleAddComponent(showAddComponentModal)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Variant */}
      {showAddVariantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Ajouter une Déclinaison (Taille/Couleur)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Déclinaison</label>
                <input
                  type="text"
                  placeholder="Ex: Blanc / XXL"
                  value={newVar.name}
                  onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SKU Déclinaison</label>
                <input
                  type="text"
                  placeholder="Ex: TSHIRT-OVR-001-WHT-XXL"
                  value={newVar.sku}
                  onChange={(e) => setNewVar({ ...newVar, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Initial</label>
                <input
                  type="number"
                  min="0"
                  value={newVar.stockQuantity}
                  onChange={(e) => setNewVar({ ...newVar, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddVariantModal(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleAddVariant(showAddVariantModal)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Material */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Nouvelle Matière Première</h3>
            <form onSubmit={handleCreateMaterial} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Matière</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bobine DTF 30cm"
                  value={newMat.name}
                  onChange={(e) => setNewMat({ ...newMat, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unité</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: rouleau, kg, litre, paquet"
                  value={newMat.unit}
                  onChange={(e) => setNewMat({ ...newMat, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coût Unitaire (DZD)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newMat.unitCost}
                  onChange={(e) => setNewMat({ ...newMat, unitCost: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Initial</label>
                  <input
                    type="number"
                    min="0"
                    value={newMat.stockQuantity}
                    onChange={(e) => setNewMat({ ...newMat, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Seuil Alerte</label>
                  <input
                    type="number"
                    min="0"
                    value={newMat.reorderPoint}
                    onChange={(e) => setNewMat({ ...newMat, reorderPoint: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Supprimer le produit {productToDelete.name} ?
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                SKU : <strong className="font-mono text-slate-700">{productToDelete.sku}</strong>
                <br />
                Variantes : <strong className="text-slate-700">{productToDelete.variants.length}</strong> | Composants : <strong className="text-slate-700">{productToDelete.costComponents.length}</strong>
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left mt-4">
                <strong>Attention :</strong> Cette action supprimera définitivement le produit, ses variantes et sa nomenclature de coût. Si des commandes existantes y font référence, la suppression sera bloquée.
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Variant Confirmation Modal */}
      {variantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Supprimer la déclinaison {variantToDelete.name} ?
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                Cette action retirera cette déclinaison du catalogue de stock.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVariantToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteVariant}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
