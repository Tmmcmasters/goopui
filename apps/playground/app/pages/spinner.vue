<template>
  <ComparePage path="/spinner">
    <CompareRow label="default">
      <template #shadcn>
        <Spinner />
      </template>
    </CompareRow>

    <CompareRow label="sizes">
      <template #shadcn>
        <Spinner class="size-3" />
        <Spinner class="size-4" />
        <Spinner class="size-6" />
        <Spinner class="size-8" />
      </template>
    </CompareRow>

    <CompareRow label="in button">
      <template #shadcn>
        <Button disabled>
          <Spinner data-icon="inline-start" /> Loading
        </Button>
        <Button variant="secondary" disabled>
          <Spinner data-icon="inline-start" /> Loading
        </Button>
        <Button variant="outline" disabled>
          <Spinner data-icon="inline-start" /> Loading
        </Button>
      </template>
    </CompareRow>
  </ComparePage>
</template>
