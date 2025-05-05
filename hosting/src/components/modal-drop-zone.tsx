import { Modal, TitleBar } from '@shopify/app-bridge-react';
import { DropZone, Box, Text, InlineStack, Icon, BlockStack } from '@shopify/polaris';
import { NoteIcon } from '@shopify/polaris-icons';
import { DropZoneFileType } from '@shopify/polaris/build/ts/src/components/DropZone';
import { useState, useCallback } from 'react';

export default function ModalDropZone({ id, title, primaryLabel, actionHint, contentTitle, accept, type, onAction }: { id: string, title: string, primaryLabel: string, actionHint?: string, contentTitle: string, accept?: string, type?: DropZoneFileType, onAction?: (files: File[]) => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[]) =>
      setFiles((files) => [...files, ...acceptedFiles]),
    [],
  );

  return (
    <Modal id={id}>
      <Box padding='400'>
        {files.length > 0 ? (
          <BlockStack gap='200'>
            <Text variant="bodyMd" as="p">{contentTitle}</Text>

            <Box padding='100'>
              {files.map((file) => (
                <InlineStack gap='200'>
                  <div><Icon source={NoteIcon} /></div>
                  <Text key={file.name} variant="bodyMd" as="p">
                    {file.name}
                  </Text>
                  <div style={{ marginLeft: 'auto' }}>
                    <Text key={file.name} variant="bodyMd" as="p" tone='subdued'>{file.size} bytes</Text>
                  </div>
                </InlineStack>
              ))}
            </Box>
          </BlockStack>
        ) : (
          <DropZone accept={accept} type={type} onDrop={handleDropZoneDrop}>
            <DropZone.FileUpload actionHint={actionHint} />
          </DropZone>
        )}
      </Box>
      <TitleBar title={title}>
        <button variant="primary" loading={loading ? 'loading' : false} onClick={async () => {
          setLoading(true);
          await onAction?.(files);
          setLoading(false);
          setFiles([]);
          shopify.modal.hide(id);
        }}>{primaryLabel}</button>
        <button disabled={loading} onClick={() => shopify.modal.hide(id)}>Cancel</button>
      </TitleBar>
    </Modal>
  );
}