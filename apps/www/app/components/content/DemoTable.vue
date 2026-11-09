<script setup lang="ts">
// Live table demos for the Table docs page: a real <GoopTable>. `set` picks the group. Keep each
// set in sync with the code sample beside it in the docs (and react-demos/display.tsx).
const props = withDefaults(defineProps<{ set?: 'basic' | 'selected' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/display.tsx).
const { isReact } = useFramework()

const invoices = [
  { invoice: 'INV001', status: 'Paid', method: 'Credit Card', amount: '$250.00' },
  { invoice: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
  { invoice: 'INV003', status: 'Unpaid', method: 'Bank Transfer', amount: '$350.00' },
  { invoice: 'INV004', status: 'Paid', method: 'Credit Card', amount: '$450.00' },
  { invoice: 'INV005', status: 'Paid', method: 'PayPal', amount: '$550.00' },
]
const picked = ref('INV002')
</script>

<template>
  <ReactIsland v-if="isReact" demo="table" :set="props.set" :pg="{ main: pg.props }" />
  <GoopTable v-else-if="props.set === 'basic'" class="mx-auto w-full max-w-xl" v-bind="pg.props">
    <GoopTableCaption>A list of your recent invoices.</GoopTableCaption>
    <GoopTableHeader>
      <GoopTableRow>
        <GoopTableHead class="w-[100px]">Invoice</GoopTableHead>
        <GoopTableHead>Status</GoopTableHead>
        <GoopTableHead>Method</GoopTableHead>
        <GoopTableHead class="text-right">Amount</GoopTableHead>
      </GoopTableRow>
    </GoopTableHeader>
    <GoopTableBody>
      <GoopTableRow v-for="row in invoices" :key="row.invoice">
        <GoopTableCell class="font-medium">{{ row.invoice }}</GoopTableCell>
        <GoopTableCell>{{ row.status }}</GoopTableCell>
        <GoopTableCell>{{ row.method }}</GoopTableCell>
        <GoopTableCell class="text-right">{{ row.amount }}</GoopTableCell>
      </GoopTableRow>
    </GoopTableBody>
    <GoopTableFooter>
      <GoopTableRow>
        <GoopTableCell :colspan="3">Total</GoopTableCell>
        <GoopTableCell class="text-right">$1,750.00</GoopTableCell>
      </GoopTableRow>
    </GoopTableFooter>
  </GoopTable>
  <GoopTable v-else class="mx-auto w-full max-w-xl" selected>
    <GoopTableHeader>
      <GoopTableRow>
        <GoopTableHead class="w-[100px]">Invoice</GoopTableHead>
        <GoopTableHead>Status</GoopTableHead>
        <GoopTableHead class="text-right">Amount</GoopTableHead>
      </GoopTableRow>
    </GoopTableHeader>
    <GoopTableBody>
      <GoopTableRow
        v-for="row in invoices.slice(0, 4)"
        :key="row.invoice"
        :data-state="picked === row.invoice ? 'selected' : undefined"
        class="cursor-pointer"
        @click="picked = row.invoice"
      >
        <GoopTableCell class="font-medium">{{ row.invoice }}</GoopTableCell>
        <GoopTableCell>{{ row.status }}</GoopTableCell>
        <GoopTableCell class="text-right">{{ row.amount }}</GoopTableCell>
      </GoopTableRow>
    </GoopTableBody>
  </GoopTable>
</template>
