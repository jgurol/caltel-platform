
import { useState, useEffect } from "react";
import { NavigationBar } from "@/components/NavigationBar";
import { QuickNavigation } from "@/components/QuickNavigation";
import { RecentQuotes } from "@/components/RecentQuotes";
import { ItemsManagement } from "@/components/ItemsManagement";
import { CategoriesManagement } from "@/components/CategoriesManagement";
import { VendorsView } from "@/components/VendorsView";
import { useIndexData } from "@/hooks/useIndexData";
import { useQuoteActions } from "@/hooks/useQuoteActions";
import { useClientActions } from "@/hooks/useClientActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const QuotingSystem = () => {
  const {
    clients,
    setClients,
    quotes,
    setQuotes,
    clientInfos,
    setClientInfos,
    isLoading,
    associatedAgentId,
    fetchClients,
    fetchQuotes,
    fetchClientInfos
  } = useIndexData();

  const {
    addQuote,
    updateQuote,
    deleteQuote,
    unarchiveQuote,
    permanentlyDeleteQuote
  } = useQuoteActions(clients, fetchQuotes);

  const { addClient } = useClientActions(clients, setClients, fetchClients);

  // Debug log when clientInfos changes in this component
  useEffect(() => {
    console.log('[QuotingSystem] clientInfos updated, length:', clientInfos.length);
    console.log('[QuotingSystem] About to pass to RecentQuotes:', clientInfos.map(c => ({ id: c.id, name: c.company_name })));
  }, [clientInfos]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <NavigationBar />
      <QuickNavigation />
      <div className="container mx-auto px-4 py-8 max-w-full">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quoting System</h1>
          <p className="text-gray-600">Create and manage quotes for your clients</p>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="quotes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="items">Items & Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quotes" className="mt-6">
            <RecentQuotes
              quotes={quotes}
              clients={clients}
              clientInfos={clientInfos}
              onAddQuote={addQuote}
              onUpdateQuote={updateQuote}
              onDeleteQuote={deleteQuote}
              onUnarchiveQuote={unarchiveQuote}
              onPermanentlyDeleteQuote={permanentlyDeleteQuote}
              associatedAgentId={associatedAgentId}
            />
          </TabsContent>
          
          <TabsContent value="items" className="mt-6">
            <ItemsManagement />
          </TabsContent>
          
          <TabsContent value="categories" className="mt-6">
            <CategoriesManagement />
          </TabsContent>
          
          <TabsContent value="vendors" className="mt-6">
            <VendorsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QuotingSystem;
